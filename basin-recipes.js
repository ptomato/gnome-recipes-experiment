const Lang = imports.lang;
const System = imports.system;

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

const Recipes = new Lang.Class({
    Name: 'Recipes',

    _init: function (db_path, manifest_path) {
        this._db_path = db_path;
        this._manifest_path = manifest_path;
    },

    _write_text_file: function (text) {
        let [file, stream] = Gio.File.new_tmp('data_XXXXXX');
        file.replace_contents(text, null, false, 0, null);
        return file.get_path();
    },

    _get_hash: function (string) {
        return GLib.compute_checksum_for_string(GLib.ChecksumType.SHA1, string, -1);
    },

    _get_toc: function (instructions) {
        return instructions.split('mw-headline').map((p, index) => {
            return {
                "@id": index,
                "hasLabel": `Step ${index+1}`,
                "hasIndexLabel": `${index}`,
                "hasIndex": index,
                "hasContent": `#Step${index}`
            };
        });
    },

    _transform: function (file, group, key, ids) {
        let instructions = file.get_value(group, key);
        instructions = instructions.split('\\n').map(p => p.trim()).filter(p => !!p).map((p, index) => {return ` <span class="mw-headline" id="Step${index}"><h2>Step ${index+1}</h2></span><p>${p}<p> `;}).join('');
        ids.forEach((id, index) => {
            instructions = instructions.replace(`[image:${index}]`, ` <img src="${ids[index]}" height="400"> `);  
        });
        return instructions;
    },

    _import_recipes: function (path, categories) {
        let entries = [];
        let file = new GLib.KeyFile();
        file.load_from_file(path, 0);
        file.get_groups()[0].forEach(group => {
            if (group === 'Metadata')
                return;

            let images = file.get_value(group, 'Images').split(';');
            let ids = images.map(image => {
                let path = `${this._db_path}/images/${group}/${image}`;
                return 'ekn:///' + this._get_hash(path);
            });

            let instructions = this._transform(file, group, 'Instructions', ids);

            let entry = {};
            entry['@id'] = 'ekn:///' + this._get_hash(group);
            entry['@type'] = 'ekn://_vocab/ArticleObject';
            entry['contentType'] = 'text/html';
            entry['tags'] = ['EknArticleObject', file.get_value(group, 'Author'), file.get_value(group, 'Category')];
            entry['indexed'] = true;
            entry['source'] = this._write_text_file(instructions);
            entry['tableOfContents'] = this._get_toc(instructions);
            entry['title'] = file.get_value(group, 'Name');
            entry['synopsis'] = file.get_value(group, 'Description');
            entry['sourceName'] = 'wikipedia';
            try {
                entry['thumbnail'] = ids[file.get_value(group, 'DefaultImage')];
            } catch(e) {}
            categories.add(file.get_value(group, 'Category'));
            entries.push(entry);
        });
        return entries;
    },

    _import_images: function (path, output) {
        let dir = Gio.File.new_for_path(path);
        let enumr = dir.enumerate_children('*', Gio.FileQueryInfoFlags.NONE, null);
        let info = enumr.next_file(null);

        while (info !== null) {
            let file = enumr.get_child(info);
            let file_type = info.get_file_type();
            let mime_type = info.get_content_type();
            let subpath = file.get_path();
            let name = info.get_name().split('.')[0];

            if (file_type === Gio.FileType.DIRECTORY) {
                this._import_images(subpath, output);
            } else if (mime_type.startsWith('image')) {
                let entry = {};
                entry['@id'] = 'ekn:///' + this._get_hash(subpath);
                entry['@type'] = 'ekn://_vocab/ImageObject';
                entry['source'] = subpath;
                entry['contentType'] = mime_type;
                entry['indexed'] = false;
                output.push(entry);
            }

            info = enumr.next_file(null);
        }
    },

    _import_chefs: function (path) {
        let entries = [];
        let file = new GLib.KeyFile();
        file.load_from_file(path, 0);
        file.get_groups()[0].forEach(group => {
            if (group === 'Metadata')
                return;
            let entry = {};
            entry['@id'] = 'ekn:///' + this._get_hash(group);
            entry['@type'] = 'ekn://_vocab/SetObject';
            entry['tags'] = ['EknSetObject', 'EknHomePageTag', 'Chefs'];
            entry['childTags'] = [group];
            entry['title'] = file.get_value(group, 'Fullname');
            entry['synopsis'] = file.get_value(group, 'Description');
            entry['featured'] = true;
            try {
                let image = file.get_value(group, 'Image').split('/')[1];
                entry['thumbnail'] = this._db_path + '/thumbnails/' + group + '/' + image;
            } catch(e) {
                // ?
            }
            entries.push(entry);
        });
        return entries;
    },

    _import_categories: function (categories) {
        return categories.map(category => {
            let entry = {};
            entry['@id'] = 'ekn:///' + this._get_hash(category);
            entry['@type'] = 'ekn://_vocab/SetObject';
            entry['tags'] = ['EknSetObject', 'EknHomePageTag'];
            entry['childTags'] = [category];
            entry['title'] = category;
            entry['featured'] = true; 
            return entry;
        });
    },

    _import_db: function () {
        let manifest = {};
        manifest['content'] = [];
        manifest['sets'] = [];

        let categories = new Set();
        manifest['content'] = manifest['content'].concat(
            this._import_recipes(this._db_path + '/data/' + 'recipes.db', categories));
        categories.add('Chefs');

        manifest['sets'] = manifest['sets'].concat(this._import_categories([...categories]));

        manifest['sets'] = manifest['sets'].concat(
          this._import_chefs(this._db_path + '/data/' + 'chefs.db'));

        let images = [];
        this._import_images(this._db_path + '/images/', images);
        this._import_images(this._db_path + '/thumbnails/', images);
        manifest['content'] = manifest['content'].concat(images);

        return manifest;
    },

    _dump_manifest: function (manifest) {
        let file = Gio.File.new_for_path(this._manifest_path);
        file.replace_contents(JSON.stringify(manifest, null, '\t'), null, false, 0, null);
    },

    run: function () {
        let manifest = this._import_db();
        this._dump_manifest(manifest);
    },
});

const USAGE = [
    'usage: basin-recipes <path_to_input_data_directory> <path_to_output_manifest>',
    '',
    'Utility that converts a recipes database into basin manifest.',
].join('\n');

function main () {
    let argv = ARGV.slice();
    let [hatch_dir, manifest_path] = argv;

    if (argv.length !== 2)
        fail_with_message(USAGE);

   let recipes = new Recipes(hatch_dir, manifest_path);
   recipes.run();
}

function fail_with_message () {
    // join args with space, a la print/console.log
    var args = Array.prototype.slice.call(arguments);
    printerr(args.join(' '));
    System.exit(1);
}

main();
