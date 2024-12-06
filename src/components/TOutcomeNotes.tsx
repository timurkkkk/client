import React, { useMemo, useState, useEffect } from 'react';
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

const API_URL = 'http://localhost:5000/api/outcome_notes';
const PRODUCTS_API_URL = 'http://localhost:5000/api/products';
const PRODUCTS_OUTCOME_API_URL = 'http://localhost:5000/api/products_outcome';
const url = new URL(API_URL, window.location.origin);

type OutcomeNote = {
    id: number;
    item_number: string;
    price: number;
    quantity: number;
    total: number;
    outcome_note_id: number;
}

type Product = {
    product_id: number;
    item_number: string;
    product_name: string;
}

type ProductsOutcome = {
    id: number;
    outcome_note_id: number;
}

type OutcomeNoteApiResponse = {
    data: Array<OutcomeNote>;
    meta: {
        totalRowCount: number;
    };
};

const OutcomeNotesTable = () => {
    const [validationErrors, setValidationErrors] = useState<
        Record<string, string | undefined>
    >({});

    const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<MRT_SortingState>([
        { id: 'id', desc: false },
    ]);
    const [pagination, setPagination] = useState<MRT_PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const [products, setProducts] = useState<Product[]>([]);
    const [productsOutcome, setProductsOutcome] = useState<ProductsOutcome[]>([]);

    useEffect(() => {
        const fetchProducts = async () => {
            const response = await fetch(PRODUCTS_API_URL);
            const data = await response.json();
            setProducts(data.data);
        };

        const fetchProductsOutcome = async () => {
            const response = await fetch(PRODUCTS_OUTCOME_API_URL);
            const data = await response.json();
            setProductsOutcome(data.data);
        };

        fetchProducts();
        fetchProductsOutcome();
    }, []);

    const columns = useMemo<MRT_ColumnDef<OutcomeNote>[]>(
        () => [
            {
                accessorKey: 'id',
                header: 'ID',
                enableEditing: false,
                size: 80,
            },
            {
                accessorKey: 'outcome_note_id',
                header: 'Номер накладной расхода',
                editVariant: 'select',
                editSelectOptions: productsOutcome.map(po => ({
                    value: po.outcome_note_id,
                    label: po.outcome_note_id.toString(),
                })),
                muiEditTextFieldProps: {
                    select: true,
                },
            },
            {
                accessorKey: 'item_number',
                header: 'Номенклатурный номер',
                editVariant: 'select',
                editSelectOptions: products.map(p => ({
                    value: p.item_number,
                    label: `${p.item_number} (${p.product_name})`,
                })),
                muiEditTextFieldProps: {
                    select: true,
                },
            },
            {
                accessorKey: 'price',
                header: 'Цена',
                Cell: ({ cell }) => parseFloat(cell.getValue<string>()).toFixed(2),
                muiEditTextFieldProps: {
                    type: 'number',
                    inputProps: { step: 0.01 },
                },
            },
            {
                accessorKey: 'quantity',
                header: 'Количество',
                muiEditTextFieldProps: {
                    type: 'number',
                },
            },
            {
                accessorKey: 'total',
                header: 'Сумма',
                Cell: ({ cell }) => parseFloat(cell.getValue<string>()).toFixed(2),
                muiEditTextFieldProps: {
                    type: 'number',
                    inputProps: { step: 0.01 },
                },
            },
        ],
        [products, productsOutcome]
    );

    const {
        data: { data = [], meta } = {},
        isError,
        isRefetching,
        isLoading,
    } = useGet<OutcomeNoteApiResponse>(url, pagination, columnFilters, globalFilter, sorting);

    const { mutateAsync: createOutcomeNote, isPending: isCreatingOutcomeNote } =
        useCreateOutcomeNote();
    const { mutateAsync: updateOutcomeNote, isPending: isUpdatingOutcomeNote } =
        useUpdateOutcomeNote();
    const { mutateAsync: deleteOutcomeNote, isPending: isDeletingOutcomeNote } =
        useDeleteOutcomeNote();

    const handleCreateOutcomeNote: MRT_TableOptions<OutcomeNote>['onCreatingRowSave'] = async ({
                                                                                                   values,
                                                                                                   table,
                                                                                               }) => {
        const newValidationErrors = validateOutcomeNote(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});
        await createOutcomeNote(values);
        table.setCreatingRow(null);
    };

    const handleSaveOutcomeNote: MRT_TableOptions<OutcomeNote>['onEditingRowSave'] = async ({
                                                                                                values,
                                                                                                table,
                                                                                            }) => {
        const newValidationErrors = validateOutcomeNote(values);
        if (Object.values(newValidationErrors).some((error) => error)) {
            setValidationErrors(newValidationErrors);
            return;
        }
        setValidationErrors({});
        await updateOutcomeNote(values);
        table.setEditingRow(null);
    };

    const openDeleteConfirmModal = (row: MRT_Row<OutcomeNote>) => {
        if (window.confirm('Are you sure you want to delete this outcome note?')) {
            deleteOutcomeNote(row.original.id);
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
        onCreatingRowSave: handleCreateOutcomeNote,
        onEditingRowCancel: () => setValidationErrors({}),
        onEditingRowSave: handleSaveOutcomeNote,
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
                Добавить запись
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

function useCreateOutcomeNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newOutcomeNote: Omit<OutcomeNote, 'id'>) => {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([newOutcomeNote]),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outcome_notes'] });
        },
    });
}

function useUpdateOutcomeNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updatedOutcomeNote: OutcomeNote) => {
            const response = await fetch(`${API_URL}/${updatedOutcomeNote.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedOutcomeNote),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outcome_notes'] });
        },
    });
}

function useDeleteOutcomeNote() {
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
            queryClient.invalidateQueries({ queryKey: ['outcome_notes'] });
        },
    });
}

function validateOutcomeNote(outcomeNote: Partial<OutcomeNote>) {
    const errors: Record<string, string> = {};

    if (!outcomeNote.item_number) {
        errors.item_number = 'Номенклатурный номер обязателен';
    }
    if (!outcomeNote.price) {
        errors.price = 'Цена обязательна';
    }
    if (!outcomeNote.quantity) {
        errors.quantity = 'Количество обязательно';
    }
    if (!outcomeNote.total) {
        errors.total = 'Сумма обязательна';
    }
    if (!outcomeNote.outcome_note_id) {
        errors.outcome_note_id = 'Номер накладной расхода обязателен';
    }

    return errors;
}

const queryClient = new QueryClient();

const OutcomeNotesTableWithProviders = () => (
    <QueryClientProvider client={queryClient}>
        <OutcomeNotesTable />
    </QueryClientProvider>
);

export default OutcomeNotesTableWithProviders;