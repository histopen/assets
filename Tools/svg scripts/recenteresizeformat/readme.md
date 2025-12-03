I already installed svgo,     "svgson": "^5.3.1",    "cheerio": "^1.0.0-rc.12",    "svgpath": "^2.6.0".
there are icons in sub folder "source".
create a tool that transforms these icons and copy the result in sub folder "target".
there are several transformations to apply. wait for my confirmation all went well after each transformation.

transformation 1:
my svg icons will be displayed in boxes with 2/1 aspect ratio.
I'd like each icon to have a max width of 400px, a max height of 200px. Therefore an icon height 100 width 50 should be transformed to height 200 width 100 . and an icon height 25 width 100 should be transformed to height 100 width 400. That means that whatever the case I will have whether width at 400 and/or height at 200.

transformation 2:
I'd like each icon to be centered horizontally and vertically.

transformation 3:
I'd like icons to have a minimum number of information in it to save space on disk and memory.
