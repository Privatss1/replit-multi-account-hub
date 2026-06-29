import { useListSkills } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Wand2 } from "lucide-react";

export default function Skills() {
  const { data: skills, isLoading } = useListSkills();

  if (isLoading) return <div className="p-8">Loading skills...</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skills Library</h1>
          <p className="text-muted-foreground mt-1">Reusable prompt templates and agent capabilities.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Skill
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills?.map((skill) => (
          <Card key={skill.id} className="bg-card">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex items-center">
                  <Wand2 className="w-4 h-4 mr-2 text-primary" />
                  {skill.name}
                </CardTitle>
                <div className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                  {skill.category}
                </div>
              </div>
              <CardDescription className="line-clamp-2 mt-2">{skill.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{skill.usageCount} uses</span>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!skills || skills.length === 0) && (
          <div className="col-span-full text-center p-12 border border-dashed border-border rounded-lg text-muted-foreground">
            No skills available. Create a prompt template.
          </div>
        )}
      </div>
    </div>
  );
}
