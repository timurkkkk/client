import { useMemo, useState, useEffect } from 'react';
import {
  MaterialReactTable,
  type MRT_ColumnDef,
  type MRT_Row,
  type MRT_TableOptions,
  type MRT_ColumnFiltersState,
  type MRT_PaginationState,
  type MRT_SortingState,
  useMaterialReactTable,
} from 'material-react-table';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import useGet from "./useGet";

const API_URL = 'http://localhost:5000/api/warehouses';
const EMPLOYEES_API_URL = 'http://localhost:5000/api/employees';
const url = new URL(API_URL, window.location.origin);

type Warehouse = {
  warehouse_id: number;
  warehouse_name: string;
  manager_inn: string | null;
  address: string;
}

type Employee = {
  id: number;
  inn: string;
  employee_name: string;
}

type WarehouseApiResponse = {
  data: Array<Warehouse>;
  meta: {
    totalRowCount: number;
  };
};

const WarehousesTable = () => {
  const [validationErrors, setValidationErrors] = useState<
      Record<string, string | undefined>
  >({});

  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<MRT_SortingState>([
    { id: 'warehouse_id', desc: false },
  ]);
  const [pagination, setPagination] = useState<MRT_PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      const response = await fetch(EMPLOYEES_API_URL);
      const data = await response.json();
      setEmployees(data.data);
    };

    fetchEmployees();
  }, []);

  const columns = useMemo<MRT_ColumnDef<Warehouse>[]>(
      () => [
        {
          accessorKey: 'warehouse_id',
          header: 'ID Склада',
          enableEditing: false,
        },
        {
          accessorKey: 'warehouse_name',
          header: 'Склад',
          muiEditTextFieldProps: {
            required: true,
            error: !!validationErrors?.warehouse_name,
            helperText: validationErrors?.warehouse_name,
            onFocus: () => setValidationErrors({ ...validationErrors, warehouse_name: undefined }),
          },
        },
        {
          accessorKey: 'manager_inn',
          header: 'Заведующий',
          editVariant: 'select',
          editSelectOptions: employees.map(e => ({
            value: e.inn,
            label: e.employee_name,
          })),
          muiEditTextFieldProps: {
            select: true,
            error: !!validationErrors?.manager_inn,
            helperText: validationErrors?.manager_inn,
          },
          Cell: ({ cell }) => employees.find(e => e.inn === cell.getValue<string>())?.employee_name ?? 'N/A',
        },
        {
          accessorKey: 'address',
          header: 'Адрес',
          muiEditTextFieldProps: {
            required: true,
            error: !!validationErrors?.address,
            helperText: validationErrors?.address,
            onFocus: () => setValidationErrors({ ...validationErrors, address: undefined }),
          },
        },
      ],
      [validationErrors, employees],
  );

  const {
    data: { data = [], meta } = {},
    isError,
    isRefetching,
    isLoading,
  } = useGet<WarehouseApiResponse>(url, pagination, columnFilters, globalFilter, sorting);

  const { mutateAsync: createWarehouse, isPending: isCreatingWarehouse } =
      useCreateWarehouse();
  const { mutateAsync: updateWarehouse, isPending: isUpdatingWarehouse } =
      useUpdateWarehouse();
  const { mutateAsync: deleteWarehouse, isPending: isDeletingWarehouse } =
      useDeleteWarehouse();

  const handleCreateWarehouse: MRT_TableOptions<Warehouse>['onCreatingRowSave'] = async ({
                                                                                           values,
                                                                                           table,
                                                                                         }) => {
    const newValidationErrors = validateWarehouse(values);
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});
    await createWarehouse(values);
    table.setCreatingRow(null);
  };

  const handleSaveWarehouse: MRT_TableOptions<Warehouse>['onEditingRowSave'] = async ({
                                                                                        values,
                                                                                        table,
                                                                                      }) => {
    const newValidationErrors = validateWarehouse(values);
    if (Object.values(newValidationErrors).some((error) => error)) {
      setValidationErrors(newValidationErrors);
      return;
    }
    setValidationErrors({});
    await updateWarehouse(values);
    table.setEditingRow(null);
  };

  const openDeleteConfirmModal = (row: MRT_Row<Warehouse>) => {
    if (window.confirm('Вы уверены что хотите удалить этот склад?')) {
      deleteWarehouse(row.original.warehouse_id);
    }
  };

  const table = useMaterialReactTable({
    columns,
    data,
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    createDisplayMode: 'row',
    editDisplayMode: 'row',
    enableEditing: true,
    getRowId: (row) => (row.warehouse_id as unknown) as string,
    muiToolbarAlertBannerProps: isError
        ? {
          color: 'error',
          children: 'Error loading data',
        }
        : undefined,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onCreatingRowCancel: () => setValidationErrors({}),
    onCreatingRowSave: handleCreateWarehouse,
    onEditingRowCancel: () => setValidationErrors({}),
    onEditingRowSave: handleSaveWarehouse,
    renderRowActions: ({ row, table }) => (
        <Box sx={{ display: 'flex', gap: '1rem' }}>
          <Tooltip title="Edit">
            <IconButton onClick={() => table.setEditingRow(row)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" onClick={() => openDeleteConfirmModal(row)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
    ),
    renderTopToolbarCustomActions: ({ table }) => (
        <Button
            variant="contained"
            onClick={() => {
              table.setCreatingRow(true);
            }}
        >
          Добавить склад
        </Button>
    ),
    rowCount: meta?.totalRowCount ?? 0,
    state: {
      columnFilters,
      globalFilter,
      isLoading,
      pagination,
      showAlertBanner: isError,
      showProgressBars: isRefetching,
      sorting,
    },
  });

  return <MaterialReactTable table={table} />;
};

function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newWarehouse: Omit<Warehouse, 'warehouse_id'>) => {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWarehouse),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedWarehouse: Warehouse) => {
      const response = await fetch(`${API_URL}/${updatedWarehouse.warehouse_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedWarehouse),
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (warehouse_id: number) => {
      const response = await fetch(`${API_URL}/${warehouse_id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
  });
}

function validateWarehouse(warehouse: Partial<Warehouse>) {
  const errors: Record<string, string> = {};

  if (!warehouse.warehouse_name) {
    errors.warehouse_name = 'Название склада обязательно';
  }

  if (!warehouse.address) {
    errors.address = 'Адрес обязателен';
  }

  return errors;
}

const queryClient = new QueryClient();

const WarehousesTableWithProviders = () => (
    <QueryClientProvider client={queryClient}>
      <WarehousesTable />
    </QueryClientProvider>
);

export default WarehousesTableWithProviders;