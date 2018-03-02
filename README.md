## GNOME Recipes Experiment ##

GNOME Recipes UI, Endless Astronomy content.

Set up with:
```bash
# build
mkdir -p ~/flapjack/checkout
cd ~/flapjack/checkout
git clone https://github.com/ptomato/gnome-recipes-experiment
pip3 install --user flapjack
curl -O ~/.config/flapjack.ini https://github.com/endlessm/flapjack/blob/master/example.flapjack.ini
flapjack setup

# front-end
flatpak remote-add eos-apps --no-gpg-verify https://ostree.endlessm.com/ostree/eos-sdk
flatpak install eos-apps com.endlessm.astronomy.en
flapjack open eos-knowledge-lib
cd eos-knowledge-lib
patch -p1 <../gnome-recipes-experiment/eos-knowledge-max-height-hack.patch
flapjack open basin
cd ../basin
patch -p1 <../gnome-recipes-experiment/basin-quick-hacks.patch
cd ../gnome-recipes-experiment
flapjack build

# back-end
mkdir recipes
cd recipes
wget -r -np -R "*index.html*" https://static.gnome.org/recipes/v1/
flapjack shell
gjs basin-recipes.js recipes/static.gnome.org/recipes/v1 recipes/basin_manifest.json
basin recipes/basin_manifest.json recipes/output.shard
eminem regenerate recipes/
exit
```

Run with:
```bash
flapjack run com.endlessm.astronomy.en -J app.yaml -O style.scss -p recipes
```
