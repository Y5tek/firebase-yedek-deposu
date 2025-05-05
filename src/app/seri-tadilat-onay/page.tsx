
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

// Placeholder data - replace with actual data source later
const approvalData = [
  { marka: "Marka A", tipOnayNo: "A123", varyant: "Varyant X", versiyon: "1.0" },
  { marka: "Marka B", tipOnayNo: "B456", varyant: "Varyant Y", versiyon: "2.1" },
  { marka: "Marka C", tipOnayNo: "C789", varyant: "Varyant Z", versiyon: "3.0" },
  { marka: "Marka A", tipOnayNo: "A124", varyant: "Varyant X", versiyon: "1.1" },
];

export default function SeriTadilatOnayPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-gradient-to-br from-background to-muted/60 p-4 sm:p-8">
       <Card className="w-full max-w-4xl shadow-xl bg-card/80 backdrop-blur-sm">
         <CardHeader>
           <CardTitle className="text-2xl font-bold text-center text-primary">
             Seri Tadilat Tip Onay Verileri
           </CardTitle>
           <CardDescription className="text-center text-muted-foreground">
             Onaylanmış seri tadilat tip verilerinin listesi.
           </CardDescription>
         </CardHeader>
         <CardContent>
            <Table>
              <TableCaption>Onaylanmış tip verileri listesi.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">Marka</TableHead>
                  <TableHead className="w-[25%]">Tip Onay No</TableHead>
                  <TableHead className="w-[25%]">Varyant</TableHead>
                  <TableHead className="w-[25%]">Versiyon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvalData.map((data, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{data.marka}</TableCell>
                    <TableCell>{data.tipOnayNo}</TableCell>
                    <TableCell>{data.varyant}</TableCell>
                    <TableCell>{data.versiyon}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
      </Card>
    </div>
  );
}
