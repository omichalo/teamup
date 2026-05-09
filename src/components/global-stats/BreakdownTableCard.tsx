import {
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

interface BreakdownTableCardProps {
  title: string;
  label: string;
  rows: Record<string, number>;
  total: number;
}

function rowPercentage(value: number, total: number): string {
  if (total <= 0) {
    return "0.0";
  }
  return ((value / total) * 100).toFixed(1);
}

export function BreakdownTableCard({
  title,
  label,
  rows,
  total,
}: BreakdownTableCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{label}</TableCell>
                <TableCell align="right">Nombre</TableCell>
                <TableCell align="right">Pourcentage</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(rows).map(([key, count]) => (
                <TableRow key={key}>
                  <TableCell>{key}</TableCell>
                  <TableCell align="right">{count}</TableCell>
                  <TableCell align="right">{rowPercentage(count, total)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
