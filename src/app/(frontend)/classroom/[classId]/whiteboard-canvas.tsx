'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiPlus,
    HiOutlineTrash,
    HiOutlinePencil,
    HiOutlineSparkles,
} from 'react-icons/hi2';

// Points are stored NORMALIZED to the 0..1 range relative to the canvas size,
// so a drawing made on the tutor's 1200px-wide canvas renders at the same
// relative position on a student's 700px canvas and after fullscreen/resize.
// (Legacy slides may contain absolute pixel coordinates > 1; the renderer
// detects and falls back to drawing those raw so old boards aren't corrupted.)
interface Point {
    x: number;
    y: number;
}

interface Line {
    points: Point[];
    color: string;
    width: number;
}

// Treat any coordinate above this as a legacy absolute pixel value rather than
// a 0..1 fraction. Normalized values never exceed 1.
const NORMALIZED_MAX = 1.0001;

// Stroke decimation to bound payload size (normalized 0..1 units). Points closer
// than this to the previous one are dropped; a single line segment is capped so
// long strokes are split rather than growing without limit.
const MIN_POINT_DISTANCE = 0.003;
const MAX_POINTS_PER_LINE = 500;

interface WhiteboardCanvasProps {
    whiteboardId: string;
    isTutor: boolean;
    initialSlides?: any[];
}

export function WhiteboardCanvas({ whiteboardId, isTutor, initialSlides }: WhiteboardCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [slides, setSlides] = useState<any[]>(initialSlides || []);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [lines, setLines] = useState<Line[]>(
        initialSlides && initialSlides.length > 0 ? initialSlides[0].data?.lines || [] : []
    );
    const [isDrawing, setIsDrawing] = useState(false);

    // Always-current copy of `lines` so save-on-pointer-up persists the latest
    // strokes regardless of React's batched state timing.
    const linesRef = useRef<Line[]>(lines);
    useEffect(() => {
        linesRef.current = lines;
    }, [lines]);

    // Mirror of `isDrawing` so the polling interval (created with a stale closure)
    // can read the live value and never overwrite an in-progress stroke.
    const isDrawingRef = useRef(isDrawing);
    useEffect(() => {
        isDrawingRef.current = isDrawing;
    }, [isDrawing]);

    // Timestamp of the last local save. Polls that land shortly after a local
    // write are ignored so a stale server response can't revert strokes the
    // tutor just drew (last-write-wins clobber).
    const lastLocalWriteRef = useRef(0);
    const LOCAL_WRITE_GUARD_MS = 2500;

    // Tools
    const [color, setColor] = useState('#000000');
    const [width, setWidth] = useState(3);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

    // Load slides only when the whiteboard actually changes. Depending on
    // `initialSlides` identity (which the parent recreates on every render) used
    // to snap the tutor back to slide 0 and reload stale lines mid-session.
    const loadedWhiteboardRef = useRef<string | null>(null);
    useEffect(() => {
        if (loadedWhiteboardRef.current === whiteboardId) return;
        loadedWhiteboardRef.current = whiteboardId;
        if (initialSlides && initialSlides.length > 0) {
            setSlides(initialSlides);
            setCurrentSlideIndex(0);
            setLines(initialSlides[0].data?.lines || []);
        } else {
            fetchSlides();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [whiteboardId, initialSlides]);

    // Draw lines whenever lines state or canvas size changes
    useEffect(() => {
        drawCanvas();
    }, [lines]);

    // Polling for slides/lines updates (especially for students)
    useEffect(() => {
        const interval = setInterval(() => {
            if (slides.length > 0) {
                pollCurrentSlide();
            }
        }, 3000); // Poll every 3 seconds

        return () => clearInterval(interval);
    }, [slides, currentSlideIndex]);

    const fetchSlides = async () => {
        try {
            const res = await fetch(`/api/whiteboards/${whiteboardId}/slides`);
            const data = await res.json().catch(() => ({}));
            if (data.slides) {
                setSlides(data.slides);
                if (data.slides.length > 0) {
                    setCurrentSlideIndex(0);
                    const initialLines = data.slides[0].data?.lines || [];
                    setLines(initialLines);
                }
            }
        } catch (err) {
            console.error('Error fetching slides:', err);
        }
    };

    const pollCurrentSlide = async () => {
        const currentSlide = slides[currentSlideIndex];
        if (!currentSlide) return;

        try {
            const res = await fetch(`/api/whiteboards/${whiteboardId}/slides`);
            const data = await res.json().catch(() => ({}));
            if (data.slides) {
                // Match the slide by id, NOT array position — a concurrent
                // add/delete/reorder shifts positions and would otherwise copy a
                // different slide's lines onto the current view.
                const polledSlide = data.slides.find((s: any) => s.id === currentSlide.id);
                if (polledSlide) {
                    const polledLines = polledSlide.data?.lines || [];
                    // Skip while actively drawing, and briefly after a local save,
                    // so an in-flight stale response can't revert fresh strokes.
                    const recentlyWroteLocally =
                        Date.now() - lastLocalWriteRef.current < LOCAL_WRITE_GUARD_MS;
                    if (
                        !isDrawingRef.current &&
                        !recentlyWroteLocally &&
                        JSON.stringify(polledLines) !== JSON.stringify(linesRef.current)
                    ) {
                        setLines(polledLines);
                    }
                }

                // Keep slide meta in sync
                setSlides(data.slides);
            }
        } catch (err) {
            console.error('Error polling slide:', err);
        }
    };

    const saveCurrentSlideData = async (linesToSave: Line[]) => {
        const currentSlide = slides[currentSlideIndex];
        if (!currentSlide) return;

        lastLocalWriteRef.current = Date.now();
        try {
            await fetch(`/api/whiteboards/${whiteboardId}/slides/${currentSlide.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: { lines: linesToSave }
                }),
            });
        } catch (err) {
            console.error('Error saving slide lines:', err);
        }
    };

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background grid lines for premium school board feel
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.5;
        const gridGap = 20;
        for (let x = 0; x < canvas.width; x += gridGap) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridGap) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Map a stored coordinate to a device pixel. Normalized values (0..1)
        // scale to the canvas; legacy absolute values (>1) are drawn as-is.
        const toPx = (v: number, dim: number) => (v <= NORMALIZED_MAX ? v * dim : v);

        // Draw user lines (read from the ref so any caller — the lines effect or
        // the resize handler — always renders the current strokes).
        linesRef.current.forEach(line => {
            if (line.points.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.moveTo(toPx(line.points[0].x, canvas.width), toPx(line.points[0].y, canvas.height));
            for (let i = 1; i < line.points.length; i++) {
                ctx.lineTo(toPx(line.points[i].x, canvas.width), toPx(line.points[i].y, canvas.height));
            }
            ctx.stroke();
        });
    };

    // Make canvas responsive
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            // Set drawing buffer sizes to match element display size
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            drawCanvas();
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
        // Register the listener once; redraws on stroke changes are handled by the
        // `[lines]` effect above. Depending on `lines` here re-subscribed the
        // window listener and reset the canvas buffer on every single point.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        
        let clientX = 0;
        let clientY = 0;

        if ('touches' in e) {
            if (e.touches.length === 0) return null;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        // Normalize to 0..1 of the canvas so the stroke is size-independent.
        return {
            x: rect.width > 0 ? (clientX - rect.left) / rect.width : 0,
            y: rect.height > 0 ? (clientY - rect.top) / rect.height : 0,
        };
    };

    // Remove any line that passes within ~2% of the eraser point. This is a real
    // erase (it deletes stroke data) rather than painting white over the board.
    const ERASE_RADIUS = 0.025;
    const eraseAt = (coords: Point) => {
        setLines(prev =>
            prev.filter(line => {
                const isNormalized = line.points.every(p => p.x <= NORMALIZED_MAX && p.y <= NORMALIZED_MAX);
                if (!isNormalized) return true; // can't reliably hit-test legacy absolute lines
                return !line.points.some(p => {
                    const dx = p.x - coords.x;
                    const dy = p.y - coords.y;
                    return Math.sqrt(dx * dx + dy * dy) <= ERASE_RADIUS;
                });
            }),
        );
    };

    const handleStartDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isTutor) return;
        const coords = getCoordinates(e);
        if (!coords) return;

        setIsDrawing(true);

        if (tool === 'eraser') {
            eraseAt(coords);
            return;
        }

        const newLine: Line = {
            points: [coords],
            color,
            width,
        };

        setLines(prev => [...prev, newLine]);
    };

    const handleDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isTutor || !isDrawing) return;
        const coords = getCoordinates(e);
        if (!coords) return;

        if (tool === 'eraser') {
            eraseAt(coords);
            return;
        }

        setLines(prev => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            // Decimate: drop points closer than MIN_POINT_DISTANCE to the previous
            // one, and cap points per line. Keeps the stored/polled payload from
            // growing without bound (every participant re-downloads it every 3s).
            const lastPoint = last.points[last.points.length - 1];
            if (lastPoint) {
                const dx = coords.x - lastPoint.x;
                const dy = coords.y - lastPoint.y;
                if (Math.sqrt(dx * dx + dy * dy) < MIN_POINT_DISTANCE) return prev;
            }
            if (last.points.length >= MAX_POINTS_PER_LINE) {
                // Start a new line segment so a single stroke can't grow unbounded.
                const newSegment: Line = { color: last.color, width: last.width, points: [lastPoint, coords] };
                return [...prev, newSegment];
            }
            // Immutable update: replace the last line with a new object rather
            // than mutating it in place, so React always sees a fresh reference.
            const updatedLast: Line = { ...last, points: [...last.points, coords] };
            return [...prev.slice(0, -1), updatedLast];
        });
    };

    const handleStopDrawing = () => {
        if (!isTutor || !isDrawing) return;
        setIsDrawing(false);
        // Persist the latest strokes via the ref (closure `lines` may be stale).
        saveCurrentSlideData(linesRef.current);
    };

    const handleClear = () => {
        if (!isTutor) return;
        if (window.confirm('Clear all drawings on this slide?')) {
            setLines([]);
            saveCurrentSlideData([]);
        }
    };

    const handleAddSlide = async () => {
        if (!isTutor) return;
        try {
            const res = await fetch(`/api/whiteboards/${whiteboardId}/slides`, {
                method: 'POST',
            });
            const data = await res.json().catch(() => ({}));
            if (data.success) {
                toast.success('New slide created');
                const updatedSlides = [...slides, data.slide];
                setSlides(updatedSlides);
                setCurrentSlideIndex(updatedSlides.length - 1);
                setLines([]);
            }
        } catch (err) {
            toast.error('Failed to create slide');
        }
    };

    const handlePrevSlide = () => {
        if (currentSlideIndex > 0) {
            const newIndex = currentSlideIndex - 1;
            setCurrentSlideIndex(newIndex);
            setLines(slides[newIndex].data?.lines || []);
        }
    };

    const handleNextSlide = () => {
        if (currentSlideIndex < slides.length - 1) {
            const newIndex = currentSlideIndex + 1;
            setCurrentSlideIndex(newIndex);
            setLines(slides[newIndex].data?.lines || []);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background border border-border rounded-xl overflow-hidden shadow-sm relative">
            {/* Top Toolbar */}
            <div className="bg-background border-b border-border px-4 py-2.5 flex items-center justify-between gap-4 z-10 shrink-0">
                {isTutor ? (
                    <div className="flex items-center gap-1.5">
                        <Button
                            size="icon"
                            variant={tool === 'pen' ? 'default' : 'outline'}
                            onClick={() => setTool('pen')}
                            className={`h-8 w-8 rounded-lg cursor-pointer ${tool === 'pen' ? 'bg-secondary hover:bg-secondary/90 text-secondary-foreground' : 'border-border text-foreground'}`}
                            title="Pen Tool"
                        >
                            <HiOutlinePencil className="h-4.5 w-4.5" />
                        </Button>
                        <Button
                            size="icon"
                            variant={tool === 'eraser' ? 'default' : 'outline'}
                            onClick={() => setTool('eraser')}
                            className={`h-8 w-8 rounded-lg cursor-pointer ${tool === 'eraser' ? 'bg-secondary hover:bg-secondary/90 text-secondary-foreground' : 'border-border text-foreground'}`}
                            title="Eraser Tool"
                        >
                            <HiOutlineSparkles className="h-4.5 w-4.5" />
                        </Button>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={handleClear}
                            className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 border-destructive/20 cursor-pointer"
                            title="Clear Slide"
                        >
                            <HiOutlineTrash className="h-4.5 w-4.5" />
                        </Button>
                    </div>
                ) : (
                    <div className="text-xs text-muted-foreground font-semibold px-2 py-1 bg-muted rounded-md select-none">
                        View Only Mode
                    </div>
                )}

                {/* Color Palette */}
                {isTutor && tool === 'pen' && (
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                        {['#000000', '#ea4335', '#0f9d58', '#4285f4', '#ab47bc'].map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-6 h-6 rounded-full border border-white/50 cursor-pointer transition-transform ${color === c ? 'scale-115 ring-2 ring-secondary' : 'hover:scale-105'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                )}

                {/* Slide Manager */}
                <div className="flex items-center gap-2">
                    <Button
                        size="icon"
                        variant="outline"
                        disabled={currentSlideIndex === 0}
                        onClick={handlePrevSlide}
                        className="h-8 w-8 rounded-lg cursor-pointer border-border text-foreground"
                    >
                        <HiOutlineChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-semibold px-2 text-foreground">
                        Slide {slides.length > 0 ? `${currentSlideIndex + 1} / ${slides.length}` : '0 / 0'}
                    </span>
                    <Button
                        size="icon"
                        variant="outline"
                        disabled={currentSlideIndex === slides.length - 1}
                        onClick={handleNextSlide}
                        className="h-8 w-8 rounded-lg cursor-pointer border-border text-foreground"
                    >
                        <HiOutlineChevronRight className="h-4 w-4" />
                    </Button>
                    {isTutor && (
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={handleAddSlide}
                            className="h-8 w-8 rounded-lg border-dashed border-secondary/30 hover:bg-secondary/10 text-secondary cursor-pointer"
                            title="Add Slide"
                        >
                            <HiPlus className="h-4.5 w-4.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Canvas Area */}
            <div ref={containerRef} className="flex-1 w-full bg-white relative select-none">
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleStartDrawing}
                    onMouseMove={handleDrawing}
                    onMouseUp={handleStopDrawing}
                    onMouseLeave={handleStopDrawing}
                    onTouchStart={handleStartDrawing}
                    onTouchMove={handleDrawing}
                    onTouchEnd={handleStopDrawing}
                    className="absolute inset-0 cursor-crosshair touch-none"
                />
            </div>
        </div>
    );
}
