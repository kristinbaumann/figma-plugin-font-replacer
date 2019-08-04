var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
figma.showUI(__html__);
const initialSelection = figma.currentPage.selection.slice(0);
function getTextNodesFrom(selection) {
    var nodes = [];
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
function renderContent(existingFonts) {
    var message = { type: "render", existingFonts };
    figma.ui.postMessage(message);
}
function getExistingFonts(selection) {
    const textNodes = getTextNodesFrom(selection);
    const existingFonts = [];
    textNodes.map(item => {
        const existingItem = existingFonts.filter(el => el.family === item.font.family && el.style === item.font.style);
        if (existingItem.length === 0) {
            existingFonts.push(item.font);
        }
    });
    return existingFonts;
}
const existingFonts = getExistingFonts(initialSelection);
renderContent(existingFonts);
figma.ui.onmessage = (msg) => __awaiter(this, void 0, void 0, function* () {
    if (msg.type === "replace-font") {
        // get node selection
        const selection = figma.currentPage.selection;
        // TODO: add check when no selection happens (and add comment in UI)
        // font to be replaced
        const oldFont = existingFonts[msg.selectedOldFontId];
        yield figma.loadFontAsync(oldFont);
        // TODO: get new font from UI
        // new font
        const newFont = {
            style: "Regular",
            family: "Roboto"
        };
        yield figma.loadFontAsync(newFont);
        // get all text nodes
        selection.forEach((node) => __awaiter(this, void 0, void 0, function* () {
            if (node.type === "TEXT") {
                // check if existing font is the font to be replaced
                console.log("oldFont", oldFont, "newFont", newFont);
                if (node.fontName.family === oldFont.family &&
                    node.fontName.style === oldFont.style) {
                    node.setRangeFontName(0, node.characters.length, newFont);
                    console.log("--- Replaced!");
                }
                else {
                    console.log("*** Font not selected for replacement");
                }
            }
        }));
        console.log("DONE!");
    }
    figma.closePlugin();
});
