/*globals define*/
define([
    'widgets/EasyDAG/DAGItem',
    'underscore'
], function(
    DAGItem,
    _
) {
    var Layer = function(parentEl, desc) {
        this.id = desc.id;
        this.name = desc.name;
        this.desc = desc;


        this.$container = parentEl
            .append('svg');

        this.$el = this.$container
            .append('g')
            .attr('id', this.id)
            .attr('class', 'position-offset');

        this.decorator = new this.desc.Decorator({
            color: desc.color,
            node: desc,
            parentEl: this.$el
        });

        this.width = this.decorator.width;
        this.height = this.decorator.height;

        this._hovering = false;
        this.$el.on('mouseenter', () => this.onHover());
        this.$el.on('mouseleave', () => this._hovering && this.onUnhover());

        this.initializeTooltips();
        // Set up decorator callbacks
        this.setupDecoratorCallbacks();
    };

    _.extend(Layer.prototype, DAGItem.prototype);

    Layer.prototype.onHover = function() {
        if (!this.isSelected() && this.isHoverAllowed()) {
            this._hovering = true;
            this.showHoverButtons();
        }
    };

    Layer.prototype.onUnhover = function() {
        this._hovering = false;
        this.hideHoverButtons();
    };

    Layer.prototype.onSelect = function() {
        DAGItem.prototype.onSelect.apply(this, arguments);
        if (this._hovering) {
            this.onUnhover();
        }
    };

    return Layer;
});
