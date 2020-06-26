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
      node.children.forEach((child) => {
        childrenIterator(child);
      });
    } else {
      if (node.type === "TEXT") nodes.push(node);
    }
  }
  selection.forEach((item) => childrenIterator(item));
  return nodes;
}

function getExistingFonts(textNodes) {
  const existingFonts: FontNameCounter[] = [];

  // loop through all text nodes
  textNodes.forEach((node) => {
    const font = node.fontName;

    // if node has missed font families
    if (node.fontName === figma.mixed) {
      const mixedFonts: FontName[] = [];
      // loop through characters of this text node
      for (let i = 0; i < node.characters.length; i++) {
        const fontOfCharacter = node.getRangeFontName(i, i + 1);
        const item = { ...fontOfCharacter };

        const existingMixedFontItem = mixedFonts.filter(
          (el) => el.family === item.family && el.style === item.style
        );
        if (existingMixedFontItem.length === 0) mixedFonts.push(item);
      }

      mixedFonts.forEach((font) => {
        const item = { ...font, amount: 1 };
        const existingItem = existingFonts.filter(
          (el) => el.family === item.family && el.style === item.style
        );
        if (existingItem.length === 0) {
          existingFonts.push(item);
        } else {
          existingItem[0].amount += 1;
        }
      });
    } else {
      // when text node has a single font family and style
      const item = { ...font, amount: 1 };
      const existingItem = existingFonts.filter(
        (el) => el.family === item.family && el.style === item.style
      );
      if (existingItem.length === 0) {
        existingFonts.push(item);
      } else {
        existingItem[0].amount += 1;
      }
    }
  });

  // sorting by name
  existingFonts.sort((a, b) => {
    if (a.family < b.family) {
      return -1;
    } else if (a.family > b.family) {
      return 1;
    }
    return 0;
  });

  // sorting by amount
  existingFonts.sort((a, b) => b.amount - a.amount);

  return existingFonts;
}

function renderExistingFonts(existingFonts) {
  figma.ui.postMessage({ type: "render-existing-fonts", existingFonts });
}

async function renderAvailableFonts() {
  let availableFonts = await figma.listAvailableFontsAsync();
  availableFonts = availableFonts.filter(
    (el) => el.fontName.family[0] != "?" && el.fontName.family[0] != "."
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
  figma.showUI(__html__, { width: 500, height: 500 });

  // get existing fonts
  const existingFonts = getExistingFonts(textNodes);
  renderExistingFonts(existingFonts);

  // get available fonts
  renderAvailableFonts();

  figma.ui.onmessage = async (msg) => {
    if (msg.type === "replace-font") {
      // get node selection
      const selection = figma.currentPage.selection;

      // get old fonts
      const oldFonts: FontName[] = [];
      msg.selectedOldFontIds.forEach(async (fontId) => {
        const oldFont = {
          family: existingFonts[fontId].family,
          style: existingFonts[fontId].style,
        } as FontName;
        oldFonts.push(oldFont);
        await figma.loadFontAsync(oldFont);
      });

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
          node.children.forEach((child) => {
            childrenIterator(child);
          });
        } else {
          if (node.type === "TEXT") {
            if (node.fontName === figma.mixed) {
              // loop through characters of this text node
              for (let i = 0; i < node.characters.length; i++) {
                const fontOfCharacter = node.getRangeFontName(i, i + 1);

                oldFonts.forEach((oldFont) => {
                  if (
                    fontOfCharacter.family === oldFont.family &&
                    fontOfCharacter.style === oldFont.style
                  ) {
                    node.setRangeFontName(i, i + 1, newFont);
                  }
                });
              }
            } else {
              // check if existing font is the font to be replaced
              oldFonts.forEach((oldFont) => {
                if (
                  (node.fontName as FontName).family === oldFont.family &&
                  (node.fontName as FontName).style === oldFont.style
                ) {
                  node.setRangeFontName(0, node.characters.length, newFont);
                }
              });
            }
          }
        }
      }
      selection.forEach((item) => childrenIterator(item));
    }

    figma.closePlugin();
  };
}
