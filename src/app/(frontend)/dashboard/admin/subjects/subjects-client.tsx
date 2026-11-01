'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlinePlus,
    HiOutlineExclamationTriangle,
    HiOutlineMagnifyingGlass,
    HiCheckCircle,
} from 'react-icons/hi2';

export type SubjectRow = {
    id: string;
    name: string;
    slug: string;
    category: { id: string; name: string } | null;
    shortDescription: string;
    isPopular: boolean;
    icon: string;
    color: string;
};

export type CategoryRow = {
    id: string;
    name: string;
};

type Props = {
    subjects: SubjectRow[];
    categories: CategoryRow[];
};

export function SubjectsClient({ subjects: initialSubjects, categories }: Props) {
    const router = useRouter();
    const [subjects, setSubjects] = useState(initialSubjects);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState<string | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [editSubject, setEditSubject] = useState<SubjectRow | null>(null);
    const [formName, setFormName] = useState('');
    const [formCategory, setFormCategory] = useState('');
    const [formShortDescription, setFormShortDescription] = useState('');
    const [formIsPopular, setFormIsPopular] = useState(false);
    const [formIcon, setFormIcon] = useState('');
    const [formColor, setFormColor] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const [deleteSubject, setDeleteSubject] = useState<SubjectRow | null>(null);

    const filtered = subjects.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.category?.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const openCreate = () => {
        setEditSubject(null);
        setFormName('');
        setFormCategory('');
        setFormShortDescription('');
        setFormIsPopular(false);
        setFormIcon('');
        setFormColor('');
        setFormError(null);
        setFormOpen(true);
    };

    const openEdit = (subject: SubjectRow) => {
        setEditSubject(subject);
        setFormName(subject.name);
        setFormCategory(subject.category?.id || '');
        setFormShortDescription(subject.shortDescription || '');
        setFormIsPopular(subject.isPopular || false);
        setFormIcon(subject.icon || '');
        setFormColor(subject.color || '');
        setFormError(null);
        setFormOpen(true);
    };

    const handleFormSubmit = async () => {
        if (!formName.trim()) { setFormError('Name is required'); return; }
        if (!formCategory) { setFormError('Category is required'); return; }
        if (formColor.trim() && !/^#[0-9a-fA-F]{3,8}$/.test(formColor.trim())) {
            setFormError('Accent color must be a valid hex value e.g. #7ab62c'); return;
        }

        setLoading('form');
        setFormError(null);

        try {
            const url = editSubject
                ? `/api/private/admin/subjects/${editSubject.id}`
                : '/api/private/admin/subjects';
            const method = editSubject ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formName.trim(),
                    category: formCategory,
                    shortDescription: formShortDescription.trim() || null,
                    isPopular: formIsPopular,
                    icon: formIcon.trim() || null,
                    color: formColor.trim() || null,
                }),
            });

            const data = await res.json();
            if (!res.ok) { setFormError(data.error || 'Failed'); return; }

            setFormOpen(false);
            router.refresh();
            const cat = categories.find(c => c.id === formCategory) || null;
            if (editSubject) {
                setSubjects(prev => prev.map(s =>
                    s.id === editSubject.id ? {
                        ...s,
                        name: formName.trim(),
                        category: cat,
                        shortDescription: formShortDescription.trim(),
                        isPopular: formIsPopular,
                        icon: formIcon.trim(),
                        color: formColor.trim(),
                    } : s
                ));
            } else {
                const newSubject: SubjectRow = {
                    id: data.subject.id,
                    name: formName.trim(),
                    slug: data.subject.slug || '',
                    category: cat,
                    shortDescription: formShortDescription.trim(),
                    isPopular: formIsPopular,
                    icon: formIcon.trim(),
                    color: formColor.trim(),
                };
                setSubjects(prev => [...prev, newSubject].sort((a, b) => a.name.localeCompare(b.name)));
            }
        } catch (e: any) {
            setFormError(e.message);
        } finally {
            setLoading(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteSubject) return;
        setLoading('delete-' + deleteSubject.id);
        setGlobalError(null);
        try {
            const res = await fetch(`/api/private/admin/subjects/${deleteSubject.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) {
                setGlobalError(data.error || 'Delete failed');
                setDeleteSubject(null);
                return;
            }
            setSubjects(prev => prev.filter(s => s.id !== deleteSubject!.id));
            setDeleteSubject(null);
        } catch (e: any) {
            setGlobalError(e.message);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="relative max-w-sm flex-1">
                    <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search subjects or categories…"
                        className="pl-9 h-10 shadow-none"
                    />
                </div>
                <Button onClick={openCreate} className="shadow-none h-10 gap-1.5 shrink-0">
                    <HiOutlinePlus className="h-4 w-4" />
                    Add Subject
                </Button>
            </div>

            {globalError && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
                    {globalError}
                </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/30">
                            <TableHead className="font-semibold">Subject</TableHead>
                            <TableHead className="font-semibold">Category</TableHead>
                            <TableHead className="font-semibold">Description</TableHead>
                            <TableHead className="font-semibold">Popular</TableHead>
                            <TableHead className="font-semibold">Slug</TableHead>
                            <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                                    {search ? `No subjects match "${search}".` : 'No subjects yet. Add one above.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(subject => (
                                <TableRow key={subject.id} className={loading === 'delete-' + subject.id ? 'opacity-50 pointer-events-none' : ''}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {subject.icon && <span className="text-base">{subject.icon}</span>}
                                            {subject.color && (
                                                <span
                                                    className="inline-block w-3 h-3 rounded-full border border-border flex-shrink-0"
                                                    style={{ background: subject.color }}
                                                />
                                            )}
                                            {subject.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {subject.category ? (
                                            <Badge variant="outline" className="text-xs font-normal shadow-none rounded-md">
                                                {subject.category.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                                        {subject.shortDescription
                                            ? subject.shortDescription.length > 60
                                                ? subject.shortDescription.slice(0, 60) + '…'
                                                : subject.shortDescription
                                            : <span>—</span>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        {subject.isPopular
                                            ? <HiCheckCircle className="h-5 w-5 text-green-600" />
                                            : <span className="text-xs text-muted-foreground">—</span>
                                        }
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">{subject.slug || '—'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                onClick={() => openEdit(subject)}
                                            >
                                                <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                                                <span className="sr-only">Edit</span>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                                                onClick={() => setDeleteSubject(subject)}
                                            >
                                                <HiOutlineTrash className="h-3.5 w-3.5" />
                                                <span className="sr-only">Delete</span>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <p className="text-xs text-muted-foreground">{filtered.length} subject{filtered.length !== 1 ? 's' : ''}{search ? ' matching' : ' total'}</p>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
                        <DialogDescription>
                            {editSubject ? 'Update the subject details.' : 'Add a new subject that tutors can teach.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">Subject name</label>
                            <Input
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="e.g. Further Mathematics"
                                className="shadow-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">Category</label>
                            <Select value={formCategory} onValueChange={setFormCategory}>
                                <SelectTrigger className="shadow-none">
                                    <SelectValue placeholder="Select a category…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">Short description <span className="font-normal text-muted-foreground">(optional)</span></label>
                            <Textarea
                                value={formShortDescription}
                                onChange={e => setFormShortDescription(e.target.value)}
                                placeholder="1-2 sentence summary shown in cards"
                                className="shadow-none resize-none"
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">Icon (emoji or name) <span className="font-normal text-muted-foreground">(optional)</span></label>
                                <Input
                                    value={formIcon}
                                    onChange={e => setFormIcon(e.target.value)}
                                    placeholder="e.g. 📐"
                                    className="shadow-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold">Accent color (hex) <span className="font-normal text-muted-foreground">(optional)</span></label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={formColor}
                                        onChange={e => setFormColor(e.target.value)}
                                        placeholder="#7ab62c"
                                        className="shadow-none"
                                    />
                                    {formColor && (
                                        <span
                                            className="w-7 h-7 rounded border border-border flex-shrink-0"
                                            style={{ background: formColor }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="form-is-popular"
                                checked={formIsPopular}
                                onChange={e => setFormIsPopular(e.target.checked)}
                                className="h-4 w-4 rounded border-border accent-primary"
                            />
                            <label htmlFor="form-is-popular" className="text-sm font-semibold cursor-pointer">
                                Feature as popular subject
                            </label>
                        </div>
                        {formError && (
                            <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                                <HiOutlineExclamationTriangle className="h-3.5 w-3.5 shrink-0" />
                                {formError}
                            </p>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="shadow-none" onClick={() => setFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={loading === 'form' || !formName.trim() || !formCategory}
                            onClick={handleFormSubmit}
                        >
                            {loading === 'form' ? 'Saving…' : editSubject ? 'Save Changes' : 'Add Subject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteSubject} onOpenChange={open => !open && setDeleteSubject(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HiOutlineExclamationTriangle className="h-5 w-5 text-red-500" />
                            Delete Subject
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{deleteSubject?.name}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                        This cannot be undone. Subjects currently taught by tutors or used in active classes cannot be deleted.
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="shadow-none" onClick={() => setDeleteSubject(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="font-bold"
                            disabled={loading?.startsWith('delete')}
                            onClick={handleDelete}
                        >
                            {loading?.startsWith('delete') ? 'Deleting…' : 'Delete Subject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
