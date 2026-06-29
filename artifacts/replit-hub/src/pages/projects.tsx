import { useListProjects, useCreateProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, Users, Database } from "lucide-react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export default function Projects() {
  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "", description: "" }
  });

  const onSubmit = (data: z.infer<typeof projectSchema>) => {
    createProject.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setOpen(false);
        form.reset();
      }
    });
  };

  if (isLoading) return <div className="p-8">Loading projects...</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage workspaces and their assigned accounts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input placeholder="Project name..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Input placeholder="Optional description..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createProject.isPending}>
                  {createProject.isPending ? "Creating..." : "Create"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map((proj) => (
          <Link key={proj.id} href={`/projects/${proj.id}`}>
            <Card className="bg-card hover:border-primary/50 transition-colors cursor-pointer group h-full">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">{proj.name}</CardTitle>
                  <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                    proj.status === 'active' ? 'bg-green-500/20 text-green-500' : 
                    proj.status === 'paused' ? 'bg-yellow-500/20 text-yellow-500' : 
                    'bg-muted text-muted-foreground'
                  }`}>
                    {proj.status}
                  </div>
                </div>
                {proj.description && <CardDescription className="line-clamp-2 mt-2">{proj.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1.5" />
                    {proj.accountCount} Accounts
                  </div>
                  <div className="flex items-center">
                    <Database className="w-4 h-4 mr-1.5" />
                    {proj.memoryCount} Memories
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {(!projects || projects.length === 0) && (
          <div className="col-span-full text-center p-12 border border-dashed border-border rounded-lg text-muted-foreground">
            No projects found. Create one to organize your agents.
          </div>
        )}
      </div>
    </div>
  );
}
