import { Editor, Transforms, Element as SlateElement, Range } from 'slate';

import { LIST_TYPES, TEXT_ALIGN_TYPES } from 'utils/constants';

// Helper Functions
// Define our own custom set of helpers.
const CustomEditor = {
    // Mark Button Active? - Leaf Element
    isMarkActive(editor, format) {
        const marks = Editor.marks(editor);
        return marks ? marks[format] === true : false;
    },
    // Block Button Active? - Block Element
    isBlockActive(editor, format, blockType = 'type') {
        const { selection } = editor;
        if (!selection) return false;

        const [match] = Array.from(
            Editor.nodes(editor, {
                at: Editor.unhangRange(editor, selection),
                match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n[blockType] === format
            })
        );

        return !!match;
    },
    // Checklist Button Active?
    isChecklistActive(editor) {
        const { selection } = editor;
        if (!selection) return false;

        const [match] = Array.from(
            Editor.nodes(editor, {
                at: Editor.unhangRange(editor, selection),
                match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'check-list-item'
            })
        );

        return !!match;
    },
    // Link Button Active?
    isLinkActive(editor) {
        const { selection } = editor;
        if (!selection) return false;

        const [link] = Editor.nodes(editor, {
            match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link'
        });

        return !!link;
    },

    // Add Link
    toggleLink(editor, url) {
        const isActive = CustomEditor.isLinkActive(editor);
        if (isActive) {
            Transforms.unwrapNodes(editor, {
                match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link'
            });
        }

        const { selection } = editor;
        const isCollapsed = selection && Range.isCollapsed(selection);
        const link = {
            type: 'link',
            url,
            children: isCollapsed ? { text: url } : []
        };

        if (isCollapsed) {
            // Transforms.insertNodes
            //  -> Atomically inserts nodes at the specified location in the document.
            //  -> If no location is specified, inserts at the current selection.
            //  -> If there is no selection, inserts at the end of the document.
            Transforms.insertNodes(editor, link);
        } else {
            // Transforms.wrapNodes
            //  -> Wrap nodes at the specified location in the element container.
            //  -> If no location is specified, wrap the selection.
            //  -> split: true
            //      ->  it's okay to split a node in order to wrap the location
            //      ->  if ipsum was selected in a Text node with lorem ipsum dolar,
            //      ->  split: true would wrap the word ipsum only, resulting in splitting the Text node.
            Transforms.wrapNodes(editor, link, { split: true });
            // -> ????????? ???????????? a tag??? wrap
            // -> ?????? ????????? ???????????? ????????? ????????? ?????? ????????? a tag ??????

            //  Transforms.collapse
            //  -> Collapse the selection to a single point.
            Transforms.collapse(editor, { edge: 'end' });
        }
    },
    // Deactivate Link Button
    unToggleLink(editor) {
        //  Transforms.unwrapNodes
        //  -> Unwrap nodes at the specified location.
        //  -> If necessary, the parent node is split.
        //  -> If no location is specified, use the selection.
        Transforms.unwrapNodes(editor, {
            match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'link',
            split: true
        });
    },
    // Add Image
    toggleImage(editor, url) {
        // ????????? ????????? p??? ???????????? ???????????? text??? ????????? ??? ?????????
        const newProperties = [
            { type: 'image', url, children: [] },
            { type: 'paragraph', children: [{ text: '' }] }
        ];
        Transforms.insertNodes(editor, newProperties);
    },
    // Add Emoji
    toggleEmoji(editor, emoji) {
        // Transform.insertText
        //  -> Insert a string of text at the specified location in the document.
        //  -> If no location is specified, insert at the current selection.
        Transforms.insertText(editor, emoji);
    },
    // Add Checklist
    toggleChecklist(editor) {
        // check-list ????????? ????????? ???????
        const isActive = CustomEditor.isChecklistActive(editor);

        // apply a single operation to zero or more Nodes
        // flatten the syntax tree by applying unwrapNodes
        Transforms.unwrapNodes(editor, {
            match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'check-list',
            split: true
        });

        let newProperties;
        if (!isActive) {
            // check list item element??? ??????
            // ??? ????????? ?????? check list element??? ?????????
            newProperties = { type: 'check-list-item' };
            //  Transforms.setNodes
            //  -> Set properties of nodes at the specified location.
            Transforms.setNodes(editor, newProperties);
            const block = { type: 'check-list', children: [] };
            Transforms.wrapNodes(editor, block);
        } else {
            // ????????? ??????
            // list-item -> p
            // unwrapNodes??? ???????????? ???????????? ul??? ???????????? ?????? ?????? p??? ???????????? ??????...
            newProperties = { type: 'paragraph' };
            Transforms.setNodes(editor, newProperties);
        }
    },
    // Add Custom Elements
    toggleBlock(editor, format) {
        const isActive = CustomEditor.isBlockActive(editor, format, TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type');
        const isList = LIST_TYPES.includes(format);

        Transforms.unwrapNodes(editor, {
            match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && LIST_TYPES.includes(n.type) && !TEXT_ALIGN_TYPES.includes(format),
            split: true
        });

        let newProperties;
        if (TEXT_ALIGN_TYPES.includes(format)) {
            newProperties = {
                align: isActive ? undefined : format
            };
        } else {
            newProperties = {
                type: isActive ? 'paragraph' : isList ? 'list-item' : format
            };
        }
        Transforms.setNodes(editor, newProperties);

        if (!isActive && isList) {
            const block = { type: format, children: [] };
            Transforms.wrapNodes(editor, block);
        }
    },
    // Add Custom Formatting
    toggleMark(editor, format) {
        const isActive = CustomEditor.isMarkActive(editor, format);

        if (isActive) {
            Editor.removeMark(editor, format);
        } else {
            Editor.addMark(editor, format, true);
        }
    }
};

export default CustomEditor;
