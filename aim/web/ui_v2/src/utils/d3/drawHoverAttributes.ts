import * as d3 from 'd3';

import {
  IDrawHoverAttributesProps,
  IAxisLineData,
  INearestCircle,
  IActivePoint,
} from 'types/utils/d3/drawHoverAttributes';
import { IGetAxisScale } from '../../types/utils/d3/getAxisScale';
import { CircleEnum, getCoordinates, XAlignmentEnum } from './index';
import HighlightEnum from 'components/HighlightModesPopover/HighlightEnum';

import 'components/LineChart/LineChart.css';
import getFormattedValue from '../formattedValue';

function drawHoverAttributes(props: IDrawHoverAttributesProps): void {
  const {
    data,
    index,
    xAlignment,
    plotBoxRef,
    visAreaRef,
    visBoxRef,
    svgNodeRef,
    bgRectNodeRef,
    xAxisLabelNodeRef,
    yAxisLabelNodeRef,
    linesNodeRef,
    highlightedNodeRef,
    attributesNodeRef,
    attributesRef,
    highlightMode,
    syncHoverState,
  } = props;

  const { top: chartTop, left: chartLeft }: { top: number; left: number } =
    visAreaRef.current?.getBoundingClientRect() || {};

  const { margin, width, height } = visBoxRef.current;

  function isMouseInVisArea(x: number, y: number): boolean {
    const padding = 5;
    return (
      x > margin.left - padding &&
      x < width - margin.right + padding &&
      y > margin.top - padding &&
      y < height - margin.bottom + padding
    );
  }

  function getClosestCircle(
    nearestCircles: INearestCircle[],
    mouseX: number,
    mouseY: number,
  ): INearestCircle {
    let closestCircles: INearestCircle[] = [];
    let minRadius = null;
    // Find closest circles
    for (let circle of nearestCircles) {
      const rX = Math.abs(circle.x - mouseX);
      const rY = Math.abs(circle.y - mouseY);
      const r = Math.sqrt(Math.pow(rX, 2) + Math.pow(rY, 2));
      if (minRadius === null || r <= minRadius) {
        if (r === minRadius) {
          // Circle coordinates can be equal, to show only one circle on hover
          // we need to keep array of closest circles
          closestCircles.push(circle);
        } else {
          minRadius = r;
          closestCircles = [circle];
        }
      }
    }
    closestCircles.sort((a, b) => (a.key > b.key ? 1 : -1));
    return closestCircles[0];
  }

  function getNearestCircles(mouseX: number): INearestCircle[] {
    const { xScale, yScale } = attributesRef.current;
    // Closest xValue for mouseX
    const xValue = xScale.invert(mouseX);

    const nearestCircles: INearestCircle[] = [];
    for (const line of data) {
      const index = d3.bisectCenter(line.data.xValues, xValue);
      const closestXPos = xScale(line.data.xValues[index]);
      const closestYPos = yScale(line.data.yValues[index]);
      const circle = {
        key: line.key,
        color: line.color,
        x: closestXPos,
        y: closestYPos,
      };
      nearestCircles.push(circle);
    }

    return nearestCircles;
  }

  function drawXAxisLabel(x: number): void {
    const visArea = d3.select(visAreaRef.current);
    const xAxisTickValue = attributesRef.current.xScale.invert(x);
    // Set X axis value label related by 'xAlignment'
    // TODO change axis label related by x alignment
    // switch (xAlignment) {
    //   case XAlignmentEnum.Epoch:
    //     break;
    //   case XAlignmentEnum.RelativeTime:
    //     break;
    //   case XAlignmentEnum.AbsoluteTime:
    //     break;
    //   default:
    //     xAxisValueLabel = xAxisTickValue;
    // }
    if (xAxisTickValue || xAxisTickValue === 0) {
      if (xAxisLabelNodeRef.current) {
        xAxisLabelNodeRef.current.remove();
        xAxisLabelNodeRef.current = null;
      }
      const formattedValue = getFormattedValue(xAxisTickValue);
      // X Axis Label
      xAxisLabelNodeRef.current = visArea
        .append('div')
        .attr('class', 'ChartMouseValue ChartMouseValueXAxis')
        .style('top', `${height - margin.bottom + 1}px`)
        .text(formattedValue);
      const axisLeftEdge = margin.left - 1;
      const axisRightEdge = width - margin.right + 1;
      let xAxisValueWidth = xAxisLabelNodeRef.current?.node()?.offsetWidth ?? 0;
      if (xAxisValueWidth > plotBoxRef.current.width) {
        xAxisValueWidth = plotBoxRef.current.width;
      }
      xAxisLabelNodeRef.current
        .style('width', `${xAxisValueWidth}px`)
        .style(
          'left',
          `${
            x - xAxisValueWidth / 2 < 0
              ? axisLeftEdge + xAxisValueWidth / 2
              : x + axisLeftEdge + xAxisValueWidth / 2 > axisRightEdge
              ? axisRightEdge - xAxisValueWidth / 2
              : x + axisLeftEdge
          }px`,
        );
    }
  }

  function drawYAxisLabel(y: number): void {
    const visArea = d3.select(visAreaRef.current);
    const yAxisTickValue = attributesRef.current.yScale.invert(y);

    if (yAxisTickValue || yAxisTickValue === 0) {
      if (yAxisLabelNodeRef.current) {
        yAxisLabelNodeRef.current.remove();
        yAxisLabelNodeRef.current = null;
      }
      const formattedValue = getFormattedValue(yAxisTickValue);
      // Y Axis Label
      yAxisLabelNodeRef.current = visArea
        .append('div')
        .attr('class', 'ChartMouseValue ChartMouseValueYAxis')
        .attr('title', formattedValue)
        .style('max-width', `${margin.left - 5}px`)
        .style('right', `${width - margin.left}px`)
        .text(formattedValue);

      const axisTopEdge = margin.top - 1;
      const axisBottomEdge = height - margin.top;
      const yAxisValueHeight =
        yAxisLabelNodeRef.current?.node()?.offsetHeight ?? 0;

      yAxisLabelNodeRef.current.style(
        'top',
        `${
          y - yAxisValueHeight / 2 < 0
            ? axisTopEdge + yAxisValueHeight / 2
            : y + axisTopEdge + yAxisValueHeight / 2 > axisBottomEdge
            ? axisBottomEdge - yAxisValueHeight / 2
            : y + axisTopEdge
        }px`,
      );
    }
  }

  function clearActiveLine(key?: string): void {
    // previous line
    if (key) {
      linesNodeRef.current.select(`[id=Line-${key}]`).classed('active', false);
      highlightedNodeRef.current?.classed('highlighted', false);
    }
  }

  function drawActiveLine(key: string): void {
    // new line
    const newActiveLine = linesNodeRef.current.select(`[id=Line-${key}]`);

    if (!newActiveLine.empty()) {
      // get lines data selector
      const linesSelectorToHighlight = newActiveLine.attr('data-selector');
      // set highlighted lines
      highlightedNodeRef.current = linesNodeRef.current
        .selectAll(`[data-selector=${linesSelectorToHighlight}]`)
        .classed('highlighted', true)
        .raise();
      // set active line
      newActiveLine.classed('active', true).raise();
    }
    attributesRef.current.lineKey = key;
  }

  function drawVerticalAxisLine(x: number): void {
    const { height, width } = plotBoxRef.current;
    const boundedHoverLineX = x < 0 ? 0 : x > width ? width : x;

    const axisLineData: IAxisLineData = {
      // hoverLine-y projection
      x1: boundedHoverLineX,
      y1: 0,
      x2: boundedHoverLineX,
      y2: height,
    };

    attributesNodeRef.current.select('#HoverLine-y').remove();

    // Draw vertical axis line
    attributesNodeRef.current
      .append('line')
      .attr('id', 'HoverLine-y')
      .attr('class', 'HoverLine')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '4 2')
      .style('fill', 'none')
      .attr('x1', axisLineData.x1)
      .attr('y1', axisLineData.y1)
      .attr('x2', axisLineData.x2)
      .attr('y2', axisLineData.y2)
      .lower();
  }

  function drawHorizontalAxisLine(y: number): void {
    const { height, width } = plotBoxRef.current;
    const boundedHoverLineY = y < 0 ? 0 : y > height ? height : y;

    const axisLineData: IAxisLineData = {
      // hoverLine-x projection
      x1: 0,
      y1: boundedHoverLineY,
      x2: width,
      y2: boundedHoverLineY,
    };

    attributesNodeRef.current.select('#HoverLine-x').remove();

    // Draw horizontal axis line
    attributesNodeRef.current
      .append('line')
      .attr('id', 'HoverLine-x')
      .attr('class', 'HoverLine')
      .style('stroke-width', 1)
      .style('stroke-dasharray', '4 2')
      .style('fill', 'none')
      .attr('x1', axisLineData.x1)
      .attr('y1', axisLineData.y1)
      .attr('x2', axisLineData.x2)
      .attr('y2', axisLineData.y2)
      .lower();
  }

  function drawActiveCircle(key: string): void {
    attributesNodeRef.current
      .select(`[id=Circle-${key}]`)
      .attr('r', CircleEnum.ActiveRadius)
      .classed('active', true)
      .raise();
  }

  function drawFocusedCircle(key: string): void {
    attributesNodeRef.current
      .selectAll('circle')
      .attr('r', CircleEnum.Radius)
      .classed('active', false)
      .classed('focus', false);

    attributesNodeRef.current
      .select(`[id=Circle-${key}]`)
      .classed('focus', true)
      .attr('r', CircleEnum.ActiveRadius)
      .raise();
  }

  function drawCircles(nearestCircles: INearestCircle[]): void {
    // Draw Circles
    attributesNodeRef.current
      .selectAll('circle')
      .data(nearestCircles)
      .join('circle')
      .attr('id', (circle: INearestCircle) => `Circle-${circle.key}`)
      .attr('class', 'HoverCircle')
      .attr('clip-path', 'url(#circles-rect-clip-' + index + ')')
      .attr('cx', (circle: INearestCircle) => circle.x)
      .attr('cy', (circle: INearestCircle) => circle.y)
      .attr('r', CircleEnum.Radius)
      .style('fill', (circle: INearestCircle) => circle.color)
      .on('click', handlePointClick);
  }

  function getActivePoint(circle: INearestCircle): IActivePoint {
    return {
      key: circle.key,
      xValue: getFormattedValue(attributesRef.current.xScale.invert(circle.x)),
      yValue: getFormattedValue(attributesRef.current.yScale.invert(circle.y)),
      xPos: circle.x,
      yPos: circle.y,
      pageX: chartLeft + circle.x + margin.left,
      pageY: chartTop + circle.y + margin.top,
      chartIndex: index,
    };
  }

  function updateHoverAttributes(xValue: number): void {
    const x = attributesRef.current.xScale(xValue);
    const [xMin, xMax] = attributesRef.current.xScale.range();
    const mouseX = x < xMin ? xMin : x > xMax ? xMax : x;
    const nearestCircles = getNearestCircles(mouseX);

    linesNodeRef.current.classed(
      'highlight',
      highlightMode !== HighlightEnum.Off,
    );
    attributesNodeRef.current.classed(
      'highlight',
      highlightMode !== HighlightEnum.Off,
    );
    drawCircles(nearestCircles);
    drawVerticalAxisLine(mouseX);
    drawXAxisLabel(mouseX);

    attributesRef.current.xStep = attributesRef.current.xScale.invert(mouseX);
  }

  function clearHoverAttributes(): void {
    attributesRef.current.activePoint = undefined;

    linesNodeRef.current.classed('highlight', false);
    attributesNodeRef.current.classed('highlight', false);

    linesNodeRef.current
      .selectAll('path')
      .classed('highlighted', false)
      .classed('active', false);

    attributesNodeRef.current
      .selectAll('circle')
      .attr('r', CircleEnum.Radius)
      .classed('active', false)
      .classed('focus', false);

    attributesNodeRef.current.select('#HoverLine-x').remove();
    if (yAxisLabelNodeRef.current) {
      yAxisLabelNodeRef.current.remove();
      yAxisLabelNodeRef.current = null;
    }
  }

  function updateFocusedChart(
    mousePos: [number, number],
    force: boolean = false,
  ): IActivePoint {
    const { mouseX, mouseY } = getCoordinates({
      mouse: mousePos,
      margin,
      xScale: attributesRef.current.xScale,
      yScale: attributesRef.current.yScale,
    });
    const nearestCircles = getNearestCircles(mouseX);
    const closestC = getClosestCircle(nearestCircles, mouseX, mouseY);

    // hover Line Changed case
    if (force || closestC.key !== attributesRef.current.lineKey) {
      linesNodeRef.current.classed(
        'highlight',
        highlightMode !== HighlightEnum.Off,
      );
      clearActiveLine(attributesRef.current.lineKey);
      drawActiveLine(closestC.key);
    }

    // hover Circle Changed case
    if (
      force ||
      closestC.key !== attributesRef.current.activePoint?.key ||
      closestC.x !== attributesRef.current.activePoint?.xPos ||
      closestC.y !== attributesRef.current.activePoint?.yPos
    ) {
      attributesNodeRef.current.classed(
        'highlight',
        highlightMode !== HighlightEnum.Off,
      );
      drawCircles(nearestCircles);
      drawVerticalAxisLine(closestC.x);
      drawHorizontalAxisLine(closestC.y);
      drawXAxisLabel(closestC.x);
      drawYAxisLabel(closestC.y);
      drawActiveCircle(closestC.key);
    }

    const activePoint = getActivePoint(closestC);
    attributesRef.current.xStep = activePoint.xValue;
    attributesRef.current.activePoint = activePoint;
    return activePoint;
  }

  function setActiveLine(lineKey: string, force: boolean = false): void {
    if (!attributesRef.current.focusedState?.active) {
      const { focusedState, activePoint, xScale, xStep } =
        attributesRef.current;
      if (
        focusedState?.chartIndex === null ||
        focusedState?.chartIndex === index
      ) {
        if (xStep) {
          const x = xScale(xStep);
          const [xMin, xMax] = xScale.range();
          const mouseX = x < xMin ? xMin : x > xMax ? xMax : x;
          const nearestCircles = getNearestCircles(mouseX);
          const closestC = nearestCircles.find((c) => c.key === lineKey);

          if (closestC) {
            // hover Line Changed case
            if (force || closestC.key !== attributesRef.current.lineKey) {
              linesNodeRef.current.classed(
                'highlight',
                highlightMode !== HighlightEnum.Off,
              );
              clearActiveLine(attributesRef.current.lineKey);
              drawActiveLine(closestC.key);
            }

            // hover Circle Changed case
            if (
              force ||
              closestC.key !== activePoint?.key ||
              closestC.x !== activePoint?.xPos ||
              closestC.y !== activePoint?.yPos
            ) {
              attributesNodeRef.current.classed(
                'highlight',
                highlightMode !== HighlightEnum.Off,
              );
              drawCircles(nearestCircles);
              drawVerticalAxisLine(closestC.x);
              drawHorizontalAxisLine(closestC.y);
              drawXAxisLabel(closestC.x);
              drawYAxisLabel(closestC.y);
              drawActiveCircle(closestC.key);
            }

            const point = getActivePoint(closestC);
            attributesRef.current.xStep = point.xValue;
            attributesRef.current.activePoint = point;

            if (typeof syncHoverState === 'function') {
              syncHoverState({ activePoint: point });
            }
          }
        } else {
          clearActiveLine(attributesRef.current.lineKey);
          drawActiveLine(lineKey);
        }
      }
    }
  }

  // Interactions
  function handlePointClick(
    this: SVGElement,
    event: MouseEvent,
    circle: INearestCircle,
  ): void {
    if (attributesRef.current.focusedState?.chartIndex !== index) {
      if (typeof syncHoverState === 'function') {
        syncHoverState(null);
      }
    }

    const mousePos: [number, number] = [
      circle.x + margin.left,
      circle.y + margin.top,
    ];
    const activePoint = updateFocusedChart(mousePos);
    drawFocusedCircle(activePoint.key);

    if (typeof syncHoverState === 'function') {
      syncHoverState({
        activePoint,
        focusedStateActive: true,
      });
    }
  }

  function handleLeaveFocusedPoint(event: MouseEvent): void {
    if (attributesRef.current.focusedState?.chartIndex !== index) {
      if (typeof syncHoverState === 'function') {
        syncHoverState(null);
      }
    }
    const mousePos = d3.pointer(event);

    const activePoint = updateFocusedChart(mousePos, true);
    if (typeof syncHoverState === 'function') {
      syncHoverState({
        activePoint,
        focusedStateActive: false,
      });
    }
  }

  function handleMouseMove(event: MouseEvent): void {
    if (attributesRef.current.focusedState?.active) {
      return;
    }
    const mousePos = d3.pointer(event);

    if (isMouseInVisArea(mousePos[0], mousePos[1])) {
      const activePoint = updateFocusedChart(mousePos);

      if (typeof syncHoverState === 'function') {
        syncHoverState({ activePoint });
      }
    }
  }

  function handleMouseLeave(event: MouseEvent): void {
    if (attributesRef.current.focusedState?.active) {
      return;
    }
    const mousePos = d3.pointer(event);

    if (!isMouseInVisArea(mousePos[0], mousePos[1])) {
      clearHoverAttributes();

      if (typeof syncHoverState === 'function') {
        syncHoverState(null);
      }
    }
  }

  function updateScales(xScale: IGetAxisScale, yScale: IGetAxisScale) {
    attributesRef.current.xScale = xScale;
    attributesRef.current.yScale = yScale;
  }

  function init() {
    const { focusedState, activePoint, xScale, yScale, xStep } =
      attributesRef.current;

    if (
      focusedState?.chartIndex === index &&
      activePoint?.xValue &&
      activePoint.yValue
    ) {
      const mousePos: [number, number] = [
        xScale(activePoint?.xValue) + margin.left,
        yScale(activePoint?.yValue) + margin.top,
      ];
      if (isMouseInVisArea(mousePos[0], mousePos[1])) {
        const activePoint = updateFocusedChart(mousePos, true);

        if (focusedState.active) {
          drawFocusedCircle(activePoint.key);
        }

        if (typeof syncHoverState === 'function') {
          syncHoverState({
            activePoint,
            focusedStateActive: focusedState.active,
          });
        }
      }
    } else {
      const xMax = xScale.range()[1];
      updateHoverAttributes(xStep ?? xMax);
    }
  }

  attributesRef.current.updateScales = updateScales;
  attributesRef.current.setActiveLine = setActiveLine;
  attributesRef.current.updateHoverAttributes = updateHoverAttributes;
  attributesRef.current.updateFocusedChart = updateFocusedChart;
  attributesRef.current.clearHoverAttributes = clearHoverAttributes;

  svgNodeRef.current?.on('mousemove', handleMouseMove);
  svgNodeRef.current?.on('mouseleave', handleMouseLeave);
  bgRectNodeRef.current?.on('click', handleLeaveFocusedPoint);
  linesNodeRef.current?.on('click', handleLeaveFocusedPoint);

  // call on every render
  init();
}

export default drawHoverAttributes;