'use client'

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { format, parse } from 'date-fns';

type ProductsOutcome = {
  id: number;
  outcome_note_id: number;
  warehouse_id: number;
  contractor: string;
  total: number;
  date: string;
}

type OutcomeNote = {
  id: number;
  item_number: string;
  price: number;
  quantity: number;
  total: number;
  outcome_note_id: number;
}

type Warehouse = {
  warehouse_id: number;
  warehouse_name: string;
}

type Product = {
  product_id: number;
  item_number: string;
  product_name: string;
}

type ProductsOutcomeFormProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouses: Warehouse[];
};

const API_URL = 'http://localhost:5000/api';
const PRODUCTS_API_URL = 'http://localhost:5000/api/products';

export default function ProductsOutcomeForm({ open, onClose, onSuccess, warehouses }: ProductsOutcomeFormProps) {
  const [productsOutcome, setProductsOutcome] = useState<Omit<ProductsOutcome, 'id'>>({
    outcome_note_id: 0,
    warehouse_id: 0,
    contractor: '',
    total: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [outcomeNotes, setOutcomeNotes] = useState<Omit<OutcomeNote, 'id'>[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchProducts = async () => {
      const response = await fetch(PRODUCTS_API_URL);
      const data = await response.json();
      setProducts(data.data);
    };

    fetchProducts();
  }, []);

  const createProductsOutcomeMutation = useMutation<
      unknown,
      unknown,
      {
        productsOutcome: Omit<ProductsOutcome, 'id'>;
        outcomeNotes: Omit<OutcomeNote, 'id'>[];
      }
  >({
    mutationFn: async (data) => {
      const response1 = await fetch(`${API_URL}/products_outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.productsOutcome),
      });
      if (!response1.ok) throw new Error('Failed to create products outcome');
      const createdProductsOutcome = await response1.json();

      const outcomeNotesWithId = data.outcomeNotes.map(note => ({
        ...note,
        outcome_note_id: data.productsOutcome.outcome_note_id
      }));

      const response2 = await fetch(`${API_URL}/outcome_notes`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(outcomeNotesWithId),
      });
      if (!response2.ok) throw new Error('Failed to create outcome notes');

      return createdProductsOutcome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productsOutcome']});
      onSuccess();
      onClose();
    },
  });

  const handleProductsOutcomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProductsOutcome(prev => ({
      ...prev,
      [name]: name === 'outcome_note_id' || name === 'warehouse_id' ? Number(value) :
          name === 'total' ? parseFloat(value) : value,
    }));
  };

  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      setProductsOutcome(prev => ({ ...prev, date: format(newDate, 'yyyy-MM-dd') }));
    }
  };

  const handleOutcomeNoteChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOutcomeNotes(prev => prev.map((note, i) =>
        i === index ? {
          ...note,
          [name]: ['price', 'quantity', 'total'].includes(name) ? parseFloat(value) : value
        } : note
    ));
  };

  const addOutcomeNote = () => {
    setOutcomeNotes(prev => [...prev, { item_number: '', price: 0, quantity: 0, total: 0, outcome_note_id: productsOutcome.outcome_note_id }]);
  };

  const removeOutcomeNote = (index: number) => {
    setOutcomeNotes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    createProductsOutcomeMutation.mutate({
      productsOutcome,
      outcomeNotes,
    });
  };

  return (
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
          <DialogTitle>Добавить расход товара</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 2 }}>
              <TextField
                  label="Номер накладной расхода"
                  name="outcome_note_id"
                  type="number"
                  value={productsOutcome.outcome_note_id}
                  onChange={handleProductsOutcomeChange}
              />
              <TextField
                  select
                  label="Склад"
                  name="warehouse_id"
                  value={productsOutcome.warehouse_id}
                  onChange={handleProductsOutcomeChange}
              >
                {warehouses.map((warehouse) => (
                    <MenuItem key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                      {warehouse.warehouse_name}
                    </MenuItem>
                ))}
              </TextField>
              <TextField
                  label="Контрагент"
                  name="contractor"
                  value={productsOutcome.contractor}
                  onChange={handleProductsOutcomeChange}
              />
              <TextField
                  label="Сумма"
                  name="total"
                  type="number"
                  inputProps={{ step: 0.01 }}
                  value={productsOutcome.total}
                  onChange={handleProductsOutcomeChange}
              />
              <DatePicker
                  label="Дата"
                  value={parse(productsOutcome.date, 'yyyy-MM-dd', new Date())}
                  onChange={handleDateChange}
                  format="dd.MM.yyyy"
              />
            </Box>

            <Box sx={{ mt: 4 }}>
              <Button startIcon={<AddIcon />} onClick={addOutcomeNote}>
                Добавить товар
              </Button>
            </Box>

            {outcomeNotes.map((note, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, my: 2, alignItems: 'center' }}>
                  <TextField
                      select
                      label="Номенклатурный номер"
                      name="item_number"
                      value={note.item_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOutcomeNoteChange(index, e)}
                  >
                    {products.map((product) => (
                        <MenuItem key={product.item_number} value={product.item_number}>
                          {`${product.item_number} (${product.product_name})`}
                        </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                      label="Цена"
                      name="price"
                      type="number"
                      inputProps={{ step: 0.01 }}
                      value={note.price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOutcomeNoteChange(index, e)}
                  />
                  <TextField
                      label="Количество"
                      name="quantity"
                      type="number"
                      value={note.quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOutcomeNoteChange(index, e)}
                  />
                  <TextField
                      label="Сумма"
                      name="total"
                      type="number"
                      inputProps={{ step: 0.01 }}
                      value={note.total}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOutcomeNoteChange(index, e)}
                  />
                  <IconButton onClick={() => removeOutcomeNote(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained" color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </LocalizationProvider>
  );
}