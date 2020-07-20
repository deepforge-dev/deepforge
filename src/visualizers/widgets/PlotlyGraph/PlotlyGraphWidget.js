/*globals define, _, $*/
define([
    './lib/plotly.min'
], function (
    Plotly
) {

    'use strict';

    const WIDGET_CLASS = 'plotly-graph';
    const PLOT_BG_COLOR = '#EEEEEE';

    function PlotlyGraphWidget(logger, container) {
        this.logger = logger.fork('widget');
        this._container = container;
        this.$el = $('<div/>');
        this._container.append(this.$el);
        this.$defaultTextDiv = $('<div>', {
            class: 'h2 center'
        }).text('No Data Available.')
            .css({
                'margin-top': this.$el.height() / 2
            });
        this.$el.append(this.$defaultTextDiv);
        this.$el.css('overflow', 'auto');
        this.$el.addClass(WIDGET_CLASS);
        this.plots = [];
        this.created = false;
        this.logger.debug('ctor finished');
        this.setTextVisibility(true);
    }

    PlotlyGraphWidget.prototype.onWidgetContainerResize = function (width, height) {
        // Nothing needs to be done here since the chart is already responsive
        this.$el.css({
            width: width,
            height: height
        });
        this.$defaultTextDiv.css({
            'margin-top': height / 2
        });
        this.logger.debug('Widget is resizing...');
    };

    // Adding/Removing/Updating items
    PlotlyGraphWidget.prototype.addNode = function (desc) {
        this.addOrUpdateNode(desc);
    };

    PlotlyGraphWidget.prototype.removeNode = function () {
        this.refreshChart();
        this.setTextVisibility(true);
    };

    PlotlyGraphWidget.prototype.addOrUpdateNode = function (desc) {
        if (desc) {
            const plotlyJSONs = Array.isArray(desc) ?
                desc.map(descr => descr.plotlyData) : [desc.plotlyData];

            plotlyJSONs.forEach(json => {
                json.layout.autosize = true;
                json.layout.width = this.$el.width();
                json.layout.plot_bgcolor = PLOT_BG_COLOR;
                json.layout.paper_bgcolor = PLOT_BG_COLOR;
            });
            this.setTextVisibility(false);
            this.refreshChart(plotlyJSONs);
        }
    };

    PlotlyGraphWidget.prototype.updateNode = function (desc) {
        this.deleteChart();
        this.addOrUpdateNode(desc);
    };

    PlotlyGraphWidget.prototype.createOrUpdateChart = function (plotlyJSONs) {
        if (!plotlyJSONs) {
            this.deleteChart();
        } else {
            if (!this.created && !_.isEmpty(plotlyJSONs)) {
                this.createChartSlider(plotlyJSONs);
                this.created = true;

            } else if(!_.isEmpty(plotlyJSONs)) {
                // Currently in plotly, ImageTraces have no react support
                // This will be updated when there's additional support
                // for react with responsive layout
                this.createChartSlider(plotlyJSONs);
            }
        }
    };

    PlotlyGraphWidget.prototype.createChartSlider = function(plotlyJSONs) {
        plotlyJSONs.forEach(plotlyJSON => {
            const plotlyDiv = $('<div/>');
            Plotly.newPlot(plotlyDiv[0], plotlyJSON);
            this.plots.push(plotlyDiv);
            this.$el.append(plotlyDiv);
        });
    };

    PlotlyGraphWidget.prototype.refreshChart = _.debounce(PlotlyGraphWidget.prototype.createOrUpdateChart, 50);

    PlotlyGraphWidget.prototype.deleteChart = function () {
        if (this.created) {
            this.plots.forEach($plot => {
                Plotly.purge($plot[0]);
                $plot.remove();
            });
        }
        this.created = false;
    };

    PlotlyGraphWidget.prototype.setTextVisibility = function (display) {
        display = display ? 'block' : 'none';
        this.$defaultTextDiv.css('display', display);
    };
    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    PlotlyGraphWidget.prototype.destroy = function () {
        this.deleteChart();
    };

    PlotlyGraphWidget.prototype.onActivate = function () {
        this.logger.debug('PlotlyGraphWidget has been activated');
    };

    PlotlyGraphWidget.prototype.onDeactivate = function () {
        this.logger.debug('PlotlyGraphWidget has been deactivated');
    };

    return PlotlyGraphWidget;
});
