/**
 * @file types.ts
 * Clean Vector Architecture Abstraction for Phase 14 Extension Point.
 * Defines hierarchical path representation:
 * VectorObject -> Path -> SubPath -> Segment -> Anchor -> Bezier Handles.
 */

export interface Point2D {
  x: number;
  y: number;
}

export type AnchorPointType = 'corner' | 'smooth' | 'symmetric' | 'sharp';

export interface Anchor {
  id: string;
  point: Point2D;
  handleIn?: Point2D;
  handleOut?: Point2D;
  type: AnchorPointType;
}

export type SegmentType = 'line' | 'cubic_bezier' | 'quadratic_bezier' | 'arc';

export interface Segment {
  id: string;
  startAnchorId: string;
  endAnchorId: string;
  type: SegmentType;
  controlPoint1?: Point2D;
  controlPoint2?: Point2D;
}

export interface SubPath {
  id: string;
  anchors: Anchor[];
  segments: Segment[];
  closed: boolean;
}

export interface Path {
  id: string;
  subPaths: SubPath[];
  fillRule?: 'nonzero' | 'evenodd';
}

export interface VectorObject {
  id: string;
  name: string;
  paths: Path[];
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDashArray?: number[];
  svgPathData?: string; // Standard SVG d string for 100% backward compatibility
}
