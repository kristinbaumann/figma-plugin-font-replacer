var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// FUNCTIONS
function getTextNodesFrom(selection) {
    const nodes = [];
    function childrenIterator(node) {
        if (node.children) {
            node.children.forEach(child => {
                childrenIterator(child);
            });
        }
        else {
            if (node.type === "TEXT")
                nodes.push(node);
        }
    }
    selection.forEach(item => childrenIterator(item));
    return nodes;
}
function getExistingFonts(textNodes) {
    const existingFonts = [];
    // loop through all text nodes
    textNodes.forEach(node => {
        const font = node.fontName;
        // if node has missed font families
        if (node.fontName === figma.mixed) {
            const mixedFonts = [];
            // loop through characters of this text node
            for (let i = 0; i < node.characters.length; i++) {
                const fontOfCharacter = node.getRangeFontName(i, i + 1);
                const item = Object.assign({}, fontOfCharacter);
                const existingMixedFontItem = mixedFonts.filter(el => el.family === item.family && el.style === item.style);
                if (existingMixedFontItem.length === 0)
                    mixedFonts.push(item);
            }
            mixedFonts.forEach(font => {
                const item = Object.assign({}, font, { amount: 1 });
                const existingItem = existingFonts.filter(el => el.family === item.family && el.style === item.style);
                if (existingItem.length === 0) {
                    existingFonts.push(item);
                }
                else {
                    existingItem[0].amount += 1;
                }
            });
        }
        else {
            // when text node has a single font family and style
            const item = Object.assign({}, font, { amount: 1 });
            const existingItem = existingFonts.filter(el => el.family === item.family && el.style === item.style);
            if (existingItem.length === 0) {
                existingFonts.push(item);
            }
            else {
                existingItem[0].amount += 1;
            }
        }
    });
    // sorting by name
    existingFonts.sort((a, b) => {
        if (a.family < b.family) {
            return -1;
        }
        else if (a.family > b.family) {
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
function renderAvailableFonts() {
    return __awaiter(this, void 0, void 0, function* () {
        let availableFonts = yield figma.listAvailableFontsAsync();
        availableFonts = availableFonts.filter(el => el.fontName.family[0] != "?" && el.fontName.family[0] != ".");
        figma.clientStorage.setAsync("available-fonts", availableFonts);
        figma.ui.postMessage({ type: "render-available-fonts", availableFonts });
    });
}
// EXECUTION
const initialSelection = figma.currentPage.selection.slice(0);
const textNodes = getTextNodesFrom(initialSelection);
if (initialSelection.length === 0 || textNodes.length === 0) {
    figma.showUI(__html__, { width: 320, height: 80 });
    figma.ui.postMessage({ type: "empty-selection" });
}
else {
    figma.showUI(__html__, { width: 500, height: 370 });
    // get existing fonts
    const existingFonts = getExistingFonts(textNodes);
    renderExistingFonts(existingFonts);
    // get available fonts
    renderAvailableFonts();
    figma.ui.onmessage = (msg) => __awaiter(this, void 0, void 0, function* () {
        if (msg.type === "replace-font") {
            // get node selection
            const selection = figma.currentPage.selection;
            // get old font
            const oldFontCounter = existingFonts[msg.selectedOldFontId];
            const oldFont = {
                family: oldFontCounter.family,
                style: oldFontCounter.style
            };
            yield figma.loadFontAsync(oldFont);
            // get new font
            const availableFonts = yield figma.clientStorage.getAsync("available-fonts");
            const newFont = availableFonts[msg.selectedNewFontId]
                .fontName;
            yield figma.loadFontAsync(newFont);
            // replace all text nodes
            function childrenIterator(node) {
                if (node.children) {
                    node.children.forEach(child => {
                        childrenIterator(child);
                    });
                }
                else {
                    if (node.type === "TEXT") {
                        if (node.fontName === figma.mixed) {
                            // loop through characters of this text node
                            for (let i = 0; i < node.characters.length; i++) {
                                const fontOfCharacter = node.getRangeFontName(i, i + 1);
                                if (fontOfCharacter.family === oldFont.family &&
                                    fontOfCharacter.style === oldFont.style) {
                                    node.setRangeFontName(i, i + 1, newFont);
                                }
                            }
                        }
                        else {
                            // check if existing font is the font to be replaced
                            if (node.fontName.family === oldFont.family &&
                                node.fontName.style === oldFont.style) {
                                node.setRangeFontName(0, node.characters.length, newFont);
                            }
                        }
                    }
                }
            }
            selection.forEach(item => childrenIterator(item));
        }
        figma.closePlugin();
    });
}
