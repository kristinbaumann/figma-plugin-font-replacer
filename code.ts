function getTextNodesFrom(selection) {
  const nodes = [];
  function childrenIterator(node) {
    if (node.children) {
      node.children.forEach(child => {
        childrenIterator(child);
      });
    } else {
      if (node.type === "TEXT")
        nodes.push({
          id: node.id,
          characters: node.characters,
          font: node.fontName
        });
    }
  }
  selection.forEach(item => childrenIterator(item));
  return nodes;
}

function renderExistingFonts(existingFonts) {
  figma.ui.postMessage({ type: "render-existing-fonts", existingFonts });
}

function getExistingFonts(selection) {
  const textNodes = getTextNodesFrom(selection);
  const existingFonts: FontName[] = [];
  textNodes.map(item => {
    const existingItem = existingFonts.filter(
      el => el.family === item.font.family && el.style === item.font.style
    );
    if (existingItem.length === 0) {
      existingFonts.push(item.font);
    }
  });
  existingFonts.sort((a, b) => {
    if (a.family < b.family) return -1;
    if (a.family > b.family) return 1;
    return 0;
  });
  return existingFonts;
}

async function renderAvailableFonts() {
  let availableFonts = await figma.listAvailableFontsAsync();
  availableFonts = availableFonts.filter(el => el.fontName.family[0] != ".");
  figma.clientStorage.setAsync("available-fonts", availableFonts);
  figma.ui.postMessage({ type: "render-available-fonts", availableFonts });
}

const initialSelection = figma.currentPage.selection.slice(0);

if (initialSelection.length === 0) {
  figma.showUI(__html__, { width: 320, height: 80 });
  figma.ui.postMessage({ type: "empty-selection" });
} else {
  figma.showUI(__html__, { width: 320, height: 480 });

  const existingFonts = getExistingFonts(initialSelection);
  renderExistingFonts(existingFonts);

  renderAvailableFonts();

  figma.ui.onmessage = async msg => {
    if (msg.type === "replace-font") {
      // get node selection
      const selection = figma.currentPage.selection;

      // font to be replaced
      const oldFont = existingFonts[msg.selectedOldFontId];
      await figma.loadFontAsync(oldFont);

      // get new font
      const availableFonts = await figma.clientStorage.getAsync(
        "available-fonts"
      );
      const newFont = availableFonts[msg.selectedNewFontId]
        .fontName as FontName;
      await figma.loadFontAsync(newFont);

      // get all text nodes
      selection.forEach(async node => {
        if (node.type === "TEXT") {
          // check if existing font is the font to be replaced
          if (
            (node.fontName as FontName).family === oldFont.family &&
            (node.fontName as FontName).style === oldFont.style
          ) {
            node.setRangeFontName(0, node.characters.length, newFont);
          }
        }
      });

      console.log("DONE!");
    }

    figma.closePlugin();
  };
}
