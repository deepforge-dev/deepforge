/*globals define*/
define([
    'panels/EasyDAG/EasyDAGControl.WidgetEventHandlers',
    'deepforge/OperationParser',
    './Colors'
], function(
    EasyDAGControlEventHandlers,
    OperationParser,
    COLORS
) {
    'use strict';
    var OperationInterfaceEditorEvents = function() {
        this._widget.allDataTypeIds = this.allDataTypeIds.bind(this);
        this._widget.allValidReferences = this.allValidReferences.bind(this);
        this._widget.addRefTo = this.addRefTo.bind(this);
        this._widget.setRefType = this.setRefType.bind(this);
        this._widget.changePtrName = this.changePtrName.bind(this);
        this._widget.removePtr = this.removePtr.bind(this);
        this._widget.getCreationNode = this.getCreationNode.bind(this);
    };

    OperationInterfaceEditorEvents.prototype.getCreationNode = function(type, id) {
        var typeName = type === 'Complex' ? 'Class' : 'Primitive',
            Decorator = this._client.decoratorManager.getDecoratorForWidget(
                this.DEFAULT_DECORATOR, 'EasyDAG');

        return {
            node: {
                id: id,
                class: 'create-node',
                name: `New ${typeName}...`,
                Decorator: Decorator,
                color: COLORS[type.toUpperCase()],
                isPrimitive: type === 'Primitive',
                attributes: {}
            }
        };
    };

    OperationInterfaceEditorEvents.prototype.allValidReferences = function() {
        // Get all meta nodes that...
        //  - are not data, pipeline or operation (or fco!)
        //  - have a plugin defined?
        // Currently you can't reference operations or pipelines.
        var notTypes = ['Data', 'Operation', 'Pipeline'];
        return this._client.getAllMetaNodes()
            .filter(node => {
                var plugins = node.getOwnRegistry('validPlugins');
                // Convention is enforced; if the plugin generates lua artifacts,
                // it should be called `Generate`.. (something)
                return plugins && plugins.indexOf('Generate') !== -1;
            })
            .filter(node => notTypes.reduce((valid, name) =>
                valid && !this.hasMetaName(node.getId(), name), true))
            .filter(node => node.getAttribute('name') !== 'FCO')
            .map(node => {
                return {
                    node: this._getObjectDescriptor(node.getId())
                };
            });
    };

    OperationInterfaceEditorEvents.prototype.allDataTypeIds = function(incAbstract) {
        return this.allDataTypes(incAbstract).map(node => node.getId());
    };

    OperationInterfaceEditorEvents.prototype.allDataTypes = function(incAbstract) {
        return this._client.getAllMetaNodes()
            .filter(node => this.hasMetaName(node.getId(), 'Data', incAbstract))
            .filter(node => !node.isAbstract());
    };

    OperationInterfaceEditorEvents.prototype.getValidSuccessors = function(nodeId) {
        if (nodeId !== this._currentNodeId) {
            return [];
        }

        return [{
            node: this._getObjectDescriptor(this.getDataTypeId())
        }];
    };

    OperationInterfaceEditorEvents.prototype.getRefName = function(node, basename) {
        // Get a dict of all invalid ptr names for the given node
        var invalid = {},
            name,
            i = 2;

        name = basename;
        node.getSetNames().concat(node.getPointerNames())
            .forEach(ptr => invalid[ptr] = true);
        
        while (invalid[name]) {
            name = basename + '_' + i;
            i++;
        }

        return name;
    };

    OperationInterfaceEditorEvents.prototype.addRefTo = function(targetId) {
        // Create a reference from the current node to the given type
        var opNode = this._client.getNode(this._currentNodeId),
            target = this._client.getNode(targetId),
            desiredName = target.getAttribute('name').toLowerCase(),
            ptrName = this.getRefName(opNode, desiredName),
            msg = `Adding ref "${ptrName}" to operation "${opNode.getAttribute('name')}"`;

        this._client.startTransaction(msg);
        this._client.setPointerMeta(this._currentNodeId, ptrName, {
            min: 1,
            max: 1,
            items: [
                {
                    id: targetId,
                    max: 1
                }
            ]
        });
        this._client.setPointer(this._currentNodeId, ptrName, null);
        this._client.completeTransaction();
    };

    OperationInterfaceEditorEvents.prototype.setRefType = function(ref, targetId) {
        var meta = this._client.getPointerMeta(this._currentNodeId, ref),
            msg = `Setting ${ref} reference type to ${targetId}`;

        if (!meta) {
            this.logger.debug(`No meta found for ${ref}. Creating a new reference to ${targetId}`);
            meta = {
                min: 1,
                max: 1,
                items: []
            };
        }

        meta.items.push({
            id: targetId,
            max: 1
        });

        this._client.startTransaction(msg);
        this._client.setPointerMeta(this._currentNodeId, ref, meta);
        this._client.completeTransaction();
    };

    OperationInterfaceEditorEvents.prototype.changePtrName = function(from, to) {
        var opNode = this._client.getNode(this._currentNodeId),
            name = opNode.getAttribute('name'),
            msg = `Renaming ref from "${from}" to "${to}" for ${name}`,
            meta = this._client.getPointerMeta(this._currentNodeId, from),
            ptrName;

        ptrName = this.getRefName(opNode, to);

        this._client.startTransaction(msg);

        // Currently, this will not update children already using old name...
        this._client.delPointerMeta(this._currentNodeId, from);
        this._client.delPointer(this._currentNodeId, from);
        this._client.setPointerMeta(this._currentNodeId, ptrName, meta);
        this._client.setPointer(this._currentNodeId, ptrName, null);

        this._client.completeTransaction();
    };

    OperationInterfaceEditorEvents.prototype.removePtr = function(name) {
        var opName = this._client.getNode(this._currentNodeId).getAttribute('name'),
            msg = `Removing ref "${name}" from "${opName}" operation`;

        this._client.startTransaction(msg);
        // Currently, this will not update children already using old name...
        this._client.delPointerMeta(this._currentNodeId, name);
        this._client.delPointer(this._currentNodeId, name);
        this._client.completeTransaction();
    };

    OperationInterfaceEditorEvents.prototype._createConnectedNode = function(typeId, isInput, baseName) {
        var node = this._client.getNode(this._currentNodeId),
            name = node.getAttribute('name'),
            msg = `Updating the interface of ${name}`,
            code = node.getAttribute('code'),
            lines = code.split('\n'),
            id,
            schema = OperationParser.parse(code),
            pos,
            argLen,
            inputName;

        // Update the source code if the inputs/outputs changed
        // we know that we are adding a node, so we don't need to do 
        // the comparing and diffing current vs new

        this._client.startTransaction(msg);
        id = this.createIONode(this._currentNodeId, typeId, isInput, baseName, true);

        if (isInput) {
            inputName = this._client.getNode(id).getAttribute('name');
            // TODO: if no arguments, don't add the ','
            if (schema.inputs.length) {
                pos = schema.inputs[schema.inputs.length-1].pos;
                argLen = schema.inputs[schema.inputs.length-1].name.length;
                var line = lines[pos.line-1];

                lines[pos.line-1] = line.substring(0, pos.col + argLen) +
                    ', ' + inputName + line.substring(pos.col + argLen);

                this._client.setAttribute(this._currentNodeId, 'code', lines.join('\n'));
            } else {
                // TODO
            }
        } else {
            // TODO: add output!
        }

        this._client.completeTransaction();

        return id;
    };

    OperationInterfaceEditorEvents.prototype._deleteNode = function(nodeId) {
        var dataName = this._client.getNode(nodeId).getAttribute('name'),
            node = this._client.getNode(this._currentNodeId),
            name = node.getAttribute('name'),
            isInput = this.isInputData(nodeId),
            msg = `Updating the interface of ${name}`,
            code = node.getAttribute('code'),
            lines = code.split('\n'),
            schema = OperationParser.parse(code);

        // If the input name is used in the code, maybe just comment it out in the args
        this._client.startTransaction(msg);
        if (isInput) {
            this._removeIOCode(lines, schema.inputs, dataName);
        } else {
            this._removeIOCode(lines, schema.outputs, dataName);
        }
        this._client.deleteNode(nodeId);
        //EasyDAGControlEventHandlers.prototype._deleteNode.apply(this, nodeId, true);
        this._client.completeTransaction();
    };

    OperationInterfaceEditorEvents.prototype._removeIOCode = function(lines, ios, name) {
        var match,
            prev,
            line,
            startIndex,
            endIndex;

        for (var i = 0; i < ios.length; i++) {
            match = ios[i];
            prev = ios[i-1];

            if (match.name === name) {
                line = lines[match.pos.line-1];

                startIndex = prev ? prev.pos.col + prev.value.toString().length : match.pos.col;
                endIndex = match.pos.col + name.length;
                lines[match.pos.line-1] = line.substring(0, startIndex) +
                    line.substring(endIndex);
                this._client.setAttribute(this._currentNodeId, 'code', lines.join('\n'));
                return true;
            }
        }
        return false;
    };

    return OperationInterfaceEditorEvents;
});
