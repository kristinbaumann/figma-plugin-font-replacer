figma.showUI(__html__);

const initialSelection = figma.currentPage.selection.slice(0);

function getTextNodesFrom(selection) {
  var nodes = [];
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

function renderContent(existingFonts) {
  var message = { type: "render", existingFonts };
  figma.ui.postMessage(message);
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
  return existingFonts;
}
const existingFonts = getExistingFonts(initialSelection);
renderContent(existingFonts);

figma.ui.onmessage = async msg => {
  if (msg.type === "replace-font") {
    // get node selection
    const selection = figma.currentPage.selection;

    // TODO: add check when no selection happens (and add comment in UI)

    // font to be replaced
    const oldFont = existingFonts[msg.selectedOldFontId];
    await figma.loadFontAsync(oldFont);

    // TODO: get new font from UI
    // new font
    const newFont = {
      style: "Regular",
      family: "Roboto"
    } as FontName;
    await figma.loadFontAsync(newFont);

    // get all text nodes
    selection.forEach(async node => {
      if (node.type === "TEXT") {
        // check if existing font is the font to be replaced
        console.log("oldFont", oldFont, "newFont", newFont);
        if (
          (node.fontName as FontName).family === oldFont.family &&
          (node.fontName as FontName).style === oldFont.style
        ) {
          node.setRangeFontName(0, node.characters.length, newFont);
          console.log("--- Replaced!");
        } else {
          console.log("*** Font not selected for replacement");
        }
      }
    });

    console.log("DONE!");
  }

  figma.closePlugin();
};
