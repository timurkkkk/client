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
import { Box, Button, IconButton, Tooltip, MenuItem } from '@mui/material';
import {
    QueryClient,
    QueryClientProvider,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import useGet from "./useGet";

const API_URL = 'http://localhost:5000/api/employees';
const POSITIONS_API_URL = 'http://localhost:5000/api/positions';
const WAREHOUSES_API_URL = 'http://localhost:5000/api/warehouses';
const url = new URL(API_URL, window.location.origin);

type Employee = {
    id: number;
    inn: string;
    warehouse_id: number;
    position_id: number;
    employee_name: string;
    phone_number: string | null;
}

type Position = {
    position_id: number;
    position_name: string;
}

type Warehouse = {
    warehouse_id: number;
    warehouse_name: string;
}

type EmployeeApiResponse = {
    data: Array<Employee>;
    meta: {
        totalRowCount: number;
    };
};

const EmployeesTable = () => {
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string | undefined>
    >({});

    const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<MRT_SortingState>([
        { id: 'inn', desc: false },
    ]);
    const [pagination, setPagination] = useState<MRT_PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const [positions, setPositions] = useState<Position[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

    useEffect(() => {
        const fetchPositions = async () => {
            const response = await fetch(POSITIONS_API_URL);
            const data = await response.json();
            setPositions(data.data);
        };

        const fetchWarehouses = async () => {
            const response = await fetch(WAREHOUSES_API_URL);
            const data = await response.json();
            setWarehouses(data.data);
        };

        fetchPositions();
        fetchWarehouses();
    }, []);

    const columns = useMemo<MRT_ColumnDef<Employee>[]>(
        () => [
            {
                accessorKey: 'id',
                header: 'ID',
                enableEditing: false,
                size: 120,
            },
            {
                accessorKey: 'inn',
                header: 'ИНН',
                muiEditTextFieldProps: {
                    required: true,
                    error: !!validationErrors?.inn,
                    helperText: validationErrors?.inn,
                    onFocus: () => setValidationErrors({ ...validationErrors, inn: undefined }),
                },
            },
            {
                accessorKey: 'warehouse_id',
                header: 'Склад',
                editVariant: 'select',
                editSelectOptions: warehouses.map(w => ({
                    value: w.warehouse_id,
                    label: w.warehouse_name,
                })),
                muiEditTextFieldProps: {
                    select: true,
                    error: !!validationErrors?.warehouse_id,
                    helperText: validationErrors?.warehouse_id,
                },
                Cell: ({ cell }) => warehouses.find(w => w.warehouse_id === cell.getValue<number>())?.warehouse_name,
            },
            {
                accessorKey: 'position_id',
                header: 'Должность',
                editVariant: 'select',
                editSelectOptions: positions.map(p => ({
                    value: p.position_id,
                    label: p.position_name,
                })),
                muiEditTextFieldProps: {
                    select: true,
                    error: !!validationErrors?.position_id,
                    helperText: validationErrors?.position_id,
                },
                Cell: ({ cell }) => positions.find(p => p.position_id === cell.getValue<number>())?.position_name,
            },
            {
                accessorKey: 'employee_name',
                header: 'ФИО',
                muiEditTextFieldProps: {
                    required: true,
                    error: !!validationErrors?.employee_name,
                    helperText: validationErrors?.employee_name,
                    onFocus: () => setValidationErrors({ ...validationErrors, employee_name: undefined }),
                },
            },
            {
                accessorKey: 'phone_number',
                header: 'Номер телефона',
                muiEditTextFieldProps: {
                    error: !!validationErrors?.phone_number,
                    helperText: validationErrors?.phone_number,
                    onFocus: () => setValidationErrors({ ...validationErrors, phone_number: undefined }),
                },
            },
        ],
        [validationErrors, positions, warehouses],
    );

    const {
        data: { data = [], meta } = {},
        isError,
        isRefetching,
        isLoading,
    } = useGet<EmployeeApiResponse>(url, pagination, columnFilters, globalFilter, sorting);

    const { mutateAsync: createEmployee, isPending: isCreatingEmployee } =
        useCreateEmployee();
    const { mutateAsync: updateEmployee, isPending: isUpdatingEmployee } =
        useUpdateEmployee();
    const { mutateAsync: deleteEmployee, isPending: isDeletingEmployee } =
        useDeleteEmployee();

    const handleCreateEmployee: MRT_TableOptions<Employee>['onCreatingRowSave'] = async ({
                                                                                             values,
                                                                                             table,
                                                                                         }) => {
        const newValidationErrors = validateEmployee(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});
        await createEmployee(values);
        table.setCreatingRow(null);
    };

    const handleSaveEmployee: MRT_TableOptions<Employee>['onEditingRowSave'] = async ({
                                                                                          values,
                                                                                          table,
                                                                                      }) => {
        const newValidationErrors = validateEmployee(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});
        await updateEmployee(values);
        table.setEditingRow(null);
    };

    const openDeleteConfirmModal = (row: MRT_Row<Employee>) => {
        if (window.confirm('Вы уверены что хотите удалить этого сотрудника?')) {
            deleteEmployee(row.original.id);
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
        getRowId: (row) => (row.id as unknown) as string,
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
        onCreatingRowSave: handleCreateEmployee,
        onEditingRowCancel: () => setValidationErrors({}),
        onEditingRowSave: handleSaveEmployee,
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
                Добавить сотрудника
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

function useCreateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newEmployee: Omit<Employee, 'id'>) => {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEmployee),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
}

function useUpdateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updatedEmployee: Employee) => {
            const response = await fetch(`${API_URL}/${updatedEmployee.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedEmployee),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
}

function useDeleteEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
}

function validateEmployee(employee: Partial<Employee>) {
    const errors: Record<string, string> = {};

    if (!employee.inn || !/^\d{12}$/.test(employee.inn)) {
        errors.inn = 'ИНН должно быть 12 цифр';
    }

    if (!employee.warehouse_id) {
        errors.warehouse_id = 'Склад обязателен';
    }

    if (!employee.position_id) {
        errors.position_id = 'Должность обязательна';
    }

    if (!employee.employee_name) {
        errors.employee_name = 'ФИО обязательно';
    }

    if (employee.phone_number && !/^\d{11}$/.test(employee.phone_number)) {
        errors.phone_number = 'Номер телефона должен быть 11 цифр';
    }

    return errors;
}

const queryClient = new QueryClient();

const EmployeesTableWithProviders = () => (
    <QueryClientProvider client={queryClient}>
        <EmployeesTable />
    </QueryClientProvider>
);

export default EmployeesTableWithProviders;