## GNOME Recipes Experiment ##

GNOME Recipes UI, Endless Astronomy content.

Set up with:
```bash
flatpak remote-add eos-apps --no-gpg-verify https://ostree.endlessm.com/ostree/eos-sdk
flatpak install eos-apps com.endlessm.astronomy.en
mkdir -p ~/flapjack/checkout
cd ~/flapjack/checkout
git clone https://github.com/ptomato/gnome-recipes-experiment
pip3 install --user flapjack
curl -O ~/.config/flapjack.ini https://github.com/endlessm/flapjack/blob/master/example.flapjack.ini
flapjack setup
flapjack open eos-knowledge-lib
cd eos-knowledge-lib
patch -p1 <../gnome-recipes-experiment/eos-knowledge-max-height-hack.patch
cd ../gnome-recipes-experiment
```

Build and run with:
```bash
flapjack build
flapjack run com.endlessm.astronomy.en -J app.yaml -O style.scss
```
