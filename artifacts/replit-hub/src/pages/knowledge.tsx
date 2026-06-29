import { useListKnowledge } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, FileText, Image as ImageIcon, Link as LinkIcon, Code } from "lucide-react";

const typeIcons: Record<string, React.ElementType> = {
  note: FileText,
  document: BookOpen,
  url: LinkIcon,
  image: ImageIcon,
  code: Code,
};

export default function Knowledge() {
  const { data: items, isLoading } = useListKnowledge();

  if (isLoading) return <div className="p-8">Loading knowledge base...</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1">Global and project-specific contextual documents.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items?.map((item) => {
          const Icon = typeIcons[item.type] || FileText;
          return (
            <Card key={item.id} className="bg-card">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-primary/10 rounded-md text-primary">
                      <Icon className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags.split(',').filter(Boolean).map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!items || items.length === 0) && (
          <div className="col-span-full text-center p-12 border border-dashed border-border rounded-lg text-muted-foreground">
            Knowledge base is empty. Add documents for agents to reference.
          </div>
        )}
      </div>
    </div>
  );
}
