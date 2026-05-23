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

interface Point {
    x: number;
    y: number;
}

interface Line {
    points: Point[];
    color: string;
    width: number;
}

interface WhiteboardCanvasProps {
    whiteboardId: string;
    isTutor: boolean;
}

export function WhiteboardCanvas({ whiteboardId, isTutor }: WhiteboardCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [slides, setSlides] = useState<any[]>([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [lines, setLines] = useState<Line[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);

    // Tools
    const [color, setColor] = useState('#000000');
    const [width, setWidth] = useState(3);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

    // Fetch slides on mount/whiteboardId change
    useEffect(() => {
        fetchSlides();
    }, [whiteboardId]);

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
            const data = await res.json();
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
            const data = await res.json();
            if (data.slides && data.slides[currentSlideIndex]) {
                const polledLines = data.slides[currentSlideIndex].data?.lines || [];
                // Only update if lines count or point length changed to prevent flickering while drawing
                const currentTotalPoints = lines.reduce((acc, l) => acc + l.points.length, 0);
                const polledTotalPoints = polledLines.reduce((acc: number, l: any) => acc + l.points.length, 0);

                if (currentTotalPoints !== polledTotalPoints && !isDrawing) {
                    setLines(polledLines);
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

        // Draw user lines
        lines.forEach(line => {
            if (line.points.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = line.color;
            ctx.lineWidth = line.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.moveTo(line.points[0].x, line.points[0].y);
            for (let i = 1; i < line.points.length; i++) {
                ctx.lineTo(line.points[i].x, line.points[i].y);
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
    }, [lines]);

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

        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const handleStartDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const coords = getCoordinates(e);
        if (!coords) return;

        setIsDrawing(true);
        const newLine: Line = {
            points: [coords],
            color: tool === 'eraser' ? '#ffffff' : color,
            width: tool === 'eraser' ? 20 : width,
        };

        setLines(prev => [...prev, newLine]);
    };

    const handleDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const coords = getCoordinates(e);
        if (!coords) return;

        setLines(prev => {
            const updated = [...prev];
            const currentLine = updated[updated.length - 1];
            if (currentLine) {
                currentLine.points = [...currentLine.points, coords];
            }
            return updated;
        });
    };

    const handleStopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        saveCurrentSlideData(lines);
    };

    const handleClear = () => {
        if (window.confirm('Clear all drawings on this slide?')) {
            setLines([]);
            saveCurrentSlideData([]);
        }
    };

    const handleAddSlide = async () => {
        try {
            const res = await fetch(`/api/whiteboards/${whiteboardId}/slides`, {
                method: 'POST',
            });
            const data = await res.json();
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

                {/* Color Palette */}
                {tool === 'pen' && (
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
