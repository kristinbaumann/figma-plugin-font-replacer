// DEFINITIONS
interface FontNameCounter {
  readonly family: string;
  readonly style: string;
  amount: number;
}

// FUNCTIONS
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

function getExistingFonts(textNodes) {
  const existingFonts: FontNameCounter[] = [];
  textNodes.forEach(({ font }) => {
    const item = { ...font, amount: 1 };
    const existingItem = existingFonts.filter(
      el => el.family === item.family && el.style === item.style
    );
    if (existingItem.length === 0) {
      existingFonts.push(item);
    } else {
      existingItem[0].amount += 1;
    }
  });
  // sorting
  existingFonts.sort((a, b) => b.amount - a.amount);

  return existingFonts;
}

function renderExistingFonts(existingFonts) {
  figma.ui.postMessage({ type: "render-existing-fonts", existingFonts });
}

async function renderAvailableFonts() {
  let availableFonts = await figma.listAvailableFontsAsync();
  availableFonts = availableFonts.filter(
    el => el.fontName.family[0] != "?" && el.fontName.family[0] != "."
  );
  figma.clientStorage.setAsync("available-fonts", availableFonts);
  figma.ui.postMessage({ type: "render-available-fonts", availableFonts });
}

// EXECUTION
const initialSelection = figma.currentPage.selection.slice(0);
const textNodes = getTextNodesFrom(initialSelection);

if (initialSelection.length === 0 || textNodes.length === 0) {
  figma.showUI(__html__, { width: 320, height: 80 });
  figma.ui.postMessage({ type: "empty-selection" });
} else {
  figma.showUI(__html__, { width: 500, height: 370 });

  // get existing fonts
  const textNodes = getTextNodesFrom(initialSelection);
  const existingFonts = getExistingFonts(textNodes);
  renderExistingFonts(existingFonts);

  // get available fonts
  renderAvailableFonts();

  figma.ui.onmessage = async msg => {
    if (msg.type === "replace-font") {
      // get node selection
      const selection = figma.currentPage.selection;

      // get old font
      const oldFontCounter = existingFonts[msg.selectedOldFontId];
      const oldFont = {
        family: oldFontCounter.family,
        style: oldFontCounter.style
      } as FontName;
      await figma.loadFontAsync(oldFont);

      // get new font
      const availableFonts = await figma.clientStorage.getAsync(
        "available-fonts"
      );
      const newFont = availableFonts[msg.selectedNewFontId]
        .fontName as FontName;
      await figma.loadFontAsync(newFont);

      // replace all text nodes
      function childrenIterator(node) {
        if (node.children) {
          node.children.forEach(child => {
            childrenIterator(child);
          });
        } else {
          if (node.type === "TEXT") {
            // check if existing font is the font to be replaced
            if (
              (node.fontName as FontName).family === oldFont.family &&
              (node.fontName as FontName).style === oldFont.style
            ) {
              node.setRangeFontName(0, node.characters.length, newFont);
            }
          }
        }
      }
      selection.forEach(item => childrenIterator(item));
    }

    figma.closePlugin();
  };
}
