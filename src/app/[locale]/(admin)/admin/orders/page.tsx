import { TableColumn } from "@/types/blocks/table";
import TableSlot from "@/components/admin/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { getAllOrders } from "@/models/order";
import { format } from "date-fns";

export default async function () {
  const orders = await getAllOrders(1, 50);

  const columns: TableColumn[] = [
    { name: "order_no", title: "Order No" },
    { name: "user_uuid", title: "User ID" },
    { name: "user_email", title: "User Email" },
    { name: "paid_email", title: "Paid Email" },
    { name: "product_name", title: "Product Name" },
    {
      name: "status",
      title: "Status",
      callback: (row) => {
        const statusMap: Record<string, string> = {
          created: "Created",
          paid: "Paid",
          deleted: "Deleted",
        };
        return statusMap[row.status] || row.status;
      },
    },
    {
      name: "amount",
      title: "Amount",
      callback: (row) => `${row.currency?.toUpperCase() === "CNY" ? "¥" : "$"} ${row.amount / 100}`,
    },
    {
      name: "created_at",
      title: "Created At",
      callback: (row) => format(new Date(row.created_at), "yyyy-MM-dd HH:mm:ss"),
    },
    {
      name: "paid_at",
      title: "Paid At",
      callback: (row) => row.paid_at ? format(new Date(row.paid_at), "yyyy-MM-dd HH:mm:ss") : "-",
    },
  ];

  const table: TableSlotType = {
    title: "All Orders",
    columns,
    data: orders,
  };

  return <TableSlot {...table} />;
}
