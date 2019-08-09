var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    const existingFonts = [];
    textNodes.map(item => {
        const existingItem = existingFonts.filter(el => el.family === item.font.family && el.style === item.font.style);
        if (existingItem.length === 0) {
            existingFonts.push(item.font);
        }
    });
    existingFonts.sort((a, b) => {
        if (a.family < b.family)
            return -1;
        if (a.family > b.family)
            return 1;
        return 0;
    });
    return existingFonts;
}
function renderExistingFonts(existingFonts) {
    figma.ui.postMessage({ type: "render-existing-fonts", existingFonts });
}
function renderAvailableFonts() {
    return __awaiter(this, void 0, void 0, function* () {
        let availableFonts = yield figma.listAvailableFontsAsync();
        availableFonts = availableFonts.filter(el => el.fontName.family[0] != ".");
        figma.clientStorage.setAsync("available-fonts", availableFonts);
        figma.ui.postMessage({ type: "render-available-fonts", availableFonts });
    });
}
const initialSelection = figma.currentPage.selection.slice(0);
const textNodes = getTextNodesFrom(initialSelection);
if (initialSelection.length === 0 || textNodes.length === 0) {
    figma.showUI(__html__, { width: 320, height: 80 });
    figma.ui.postMessage({ type: "empty-selection" });
}
else {
    figma.showUI(__html__, { width: 320, height: 480 });
    const textNodes = getTextNodesFrom(initialSelection);
    const existingFonts = getExistingFonts(textNodes);
    renderExistingFonts(existingFonts);
    renderAvailableFonts();
    figma.ui.onmessage = (msg) => __awaiter(this, void 0, void 0, function* () {
        if (msg.type === "replace-font") {
            // get node selection
            const selection = figma.currentPage.selection;
            // font to be replaced
            const oldFont = existingFonts[msg.selectedOldFontId];
            yield figma.loadFontAsync(oldFont);
            // get new font
            const availableFonts = yield figma.clientStorage.getAsync("available-fonts");
            const newFont = availableFonts[msg.selectedNewFontId]
                .fontName;
            yield figma.loadFontAsync(newFont);
            // get all text nodes
            selection.forEach((node) => __awaiter(this, void 0, void 0, function* () {
                if (node.type === "TEXT") {
                    // check if existing font is the font to be replaced
                    if (node.fontName.family === oldFont.family &&
                        node.fontName.style === oldFont.style) {
                        node.setRangeFontName(0, node.characters.length, newFont);
                    }
                }
            }));
            console.log("DONE!");
        }
        figma.closePlugin();
    });
}
