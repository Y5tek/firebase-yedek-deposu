'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building } from 'lucide-react';
import { useAppState } from '@/hooks/use-app-state'; // Import the hook

// Updated branch list
const branches = [
  { id: 'kocaeli', name: 'KOCAELİ' },
  { id: 'malatya', name: 'MALATYA' },
  { id: 'erzurum', name: 'ERZURUM' },
  { id: 'bursa', name: 'BURSA' },
  { id: 'corlu', name: 'ÇORLU' }, // Use 'corlu' for ID
];

const FormSchema = z.object({
  branch: z.string({
    required_error: 'Lütfen bir şube seçin.',
  }),
});

export default function SelectBranchPage() {
  const router = useRouter();
  const { setBranch, branch: currentBranch } = useAppState(); // Get state and setter

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      branch: currentBranch || '', // Initialize with current branch
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    setBranch(data.branch); // Save selected branch to state
    router.push('/record-choice');
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Building className="text-primary" />
            Şube Seçimi
          </CardTitle>
          <CardDescription>Lütfen işlem yapmak istediğiniz şubeyi seçin.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şube</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Bir şube seçin..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                Devam Et
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
