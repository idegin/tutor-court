import { Button } from "@/components/ui/button";
import { HiOutlineChevronDown } from "react-icons/hi2";

interface EditClassHeaderProps {
    title: string;
}

export function EditClassHeader({ title }: EditClassHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-8">
            <div className="space-y-1">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{title}</h1>
                <p className="text-muted-foreground text-lg font-medium">Give your new class a descriptive name</p>
            </div>

            <Button variant="outline" className="shadow-none rounded-full border-border/80 px-6 font-semibold py-2 h-auto text-base">
                Drafts
                <HiOutlineChevronDown className="ml-2 h-4 w-4 text-muted-foreground" />
            </Button>
        </div>
    );
}