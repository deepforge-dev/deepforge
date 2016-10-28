/*globals define, $*/
/*jshint browser: true*/

define([
    './ModelItem',
    'text!./Table.html',
    'css!./styles/ArtifactIndexWidget.css'
], function (
    ModelItem,
    TABLE_HTML
) {
    'use strict';

    var ArtifactIndexWidget,
        WIDGET_CLASS = 'artifact-index',
        nop = function(){};

    ArtifactIndexWidget = function (logger, container) {
        this._logger = logger.fork('Widget');

        this.$el = container;

        this.nodes = {};
        this.currentNode = null;
        this._initialize();

        this._logger.debug('ctor finished');
    };

    ArtifactIndexWidget.prototype._initialize = function () {
        // set widget class
        this.$el.addClass(WIDGET_CLASS);

        this.$content = $(TABLE_HTML);
        this.$el.append(this.$content);
        this.$list = this.$content.find('.list-content');
    };

    ArtifactIndexWidget.prototype.onWidgetContainerResize = nop;

    // Adding/Removing/Updating items
    ArtifactIndexWidget.prototype.addNode = function (desc) {
        if (desc && desc.parentId === this.currentNode) {
            var node = new ModelItem(this.$list, desc);
            this.nodes[desc.id] = node;
            node.$delete.on('click', event => {
                this.onNodeDeleteClicked(desc.id);
                event.stopPropagation();
                event.preventDefault();
            });
            node.$download.on('click', event => event.stopPropagation());
            node.$el.on('click', event => {
                this.onNodeClick(desc.id);
                event.stopPropagation();
                event.preventDefault();
            });
        }
    };

    ArtifactIndexWidget.prototype.removeNode = function (gmeId) {
        var node = this.nodes[gmeId];
        if (node) {
            node.remove();
            delete this.nodes[gmeId];
        }
    };

    ArtifactIndexWidget.prototype.updateNode = function (desc) {
        if (desc && desc.parentId === this.currentNode) {
            this.nodes[desc.id].update(desc);
        }
    };

    /* * * * * * * * Visualizer event handlers * * * * * * * */


    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    ArtifactIndexWidget.prototype.destroy = function () {
    };

    ArtifactIndexWidget.prototype.onActivate = function () {
    };

    ArtifactIndexWidget.prototype.onDeactivate = function () {
    };

    return ArtifactIndexWidget;
});
