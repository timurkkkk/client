import { useMemo, useState } from 'react';
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

const API_URL = 'http://localhost:5000/api/positions';
const url = new URL(API_URL, window.location.origin);

type Position = {
    position_id: number;
    position_name: string;
    salary: number | null;
}

type PositionApiResponse = {
    data: Array<Position>;
    meta: {
        totalRowCount: number;
    };
};

const PositionsTable = () => {
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string | undefined>
    >({});

    const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<MRT_SortingState>([
        { id: 'position_id', desc: false },
    ]);
    const [pagination, setPagination] = useState<MRT_PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const columns = useMemo<MRT_ColumnDef<Position>[]>(
        () => [
            {
                accessorKey: 'position_id',
                header: 'Код должности',
                enableEditing: false,
            },
            {
                accessorKey: 'position_name',
                header: 'Наименование',
                muiEditTextFieldProps: {
                    required: true,
                    error: !!validationErrors?.position_name,
                    helperText: validationErrors?.position_name,
                    onFocus: () => setValidationErrors({ ...validationErrors, position_name: undefined }),
                },
            },
            {
                accessorKey: 'salary',
                header: 'Зарплата',
                muiEditTextFieldProps: {
                    type: 'number',
                    error: !!validationErrors?.salary,
                    helperText: validationErrors?.salary,
                    onFocus: () => setValidationErrors({ ...validationErrors, salary: undefined }),
                },
            },
        ],
        [validationErrors],
    );

    const {
        data: { data = [], meta } = {},
        isError,
        isRefetching,
        isLoading,
    } = useGet<PositionApiResponse>(url, pagination, columnFilters, globalFilter, sorting);

    const { mutateAsync: createPosition, isPending: isCreatingPosition } =
        useCreatePosition();
    const { mutateAsync: updatePosition, isPending: isUpdatingPosition } =
        useUpdatePosition();
    const { mutateAsync: deletePosition, isPending: isDeletingPosition } =
        useDeletePosition();

    const handleCreatePosition: MRT_TableOptions<Position>['onCreatingRowSave'] = async ({
                                                                                             values,
                                                                                             table,
                                                                                         }) => {
        const newValidationErrors = validatePosition(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});
        await createPosition(values);
        table.setCreatingRow(null);
    };

    const handleSavePosition: MRT_TableOptions<Position>['onEditingRowSave'] = async ({
                                                                                          values,
                                                                                          table,
                                                                                      }) => {
        const newValidationErrors = validatePosition(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});
        await updatePosition(values);
        table.setEditingRow(null);
    };

    const openDeleteConfirmModal = (row: MRT_Row<Position>) => {
        if (window.confirm('Are you sure you want to delete this position?')) {
            deletePosition(row.original.position_id);
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
        getRowId: (row) => (row.position_id as unknown) as string,
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
        onCreatingRowSave: handleCreatePosition,
        onEditingRowCancel: () => setValidationErrors({}),
        onEditingRowSave: handleSavePosition,
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
                Добавить должность
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

function useCreatePosition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newPosition: Omit<Position, 'position_id'>) => {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPosition),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
        },
    });
}

function useUpdatePosition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updatedPosition: Position) => {
            const response = await fetch(`${API_URL}/${updatedPosition.position_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPosition),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
        },
    });
}

function useDeletePosition() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (position_id: number) => {
            const response = await fetch(`${API_URL}/${position_id}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
        },
    });
}

function validatePosition(position: Partial<Position>) {
    const errors: Record<string, string> = {};

    if (!position.position_name) {
        errors.position_name = 'Наименование обязательно';
    }

    if (position.salary !== null && position.salary !== undefined) {
        if (isNaN(position.salary) || !Number.isInteger(position.salary * 100)) {
            errors.salary = '';
        }
    }

    return errors;
}

const queryClient = new QueryClient();

const PositionsTableWithProviders = () => (
    <QueryClientProvider client={queryClient}>
        <PositionsTable />
    </QueryClientProvider>
);

export default PositionsTableWithProviders;