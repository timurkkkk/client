import React from 'react';

interface DropdownExampleProps {
    onSelect: (option: string) => void;
    selectedOption: string;
}

const DropdownExample: React.FC<DropdownExampleProps> = ({ onSelect, selectedOption }) => {
    const options = [
        { value: 'option1', label: 'Склады' },
        { value: 'option2', label: 'Сотрудники' },
        { value: 'option3', label: 'Должности' },
        { value: 'option4', label: 'Товары' },
        { value: 'option5', label: 'Приход товаров' },
        { value: 'option6', label: 'Накладные прихода' },
        { value: 'option7', label: 'Расход товара' },
        { value: 'option8', label: 'Накладная расхода' },
        { value: 'option9', label: 'Отчеты' },
    ];

    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const value = event.target.value;
        onSelect(value);
    };

    return (
        <div>
            <h1>Таблицы</h1>
            <label htmlFor="mySelect">Выберите таблицу: </label>
            <select id="mySelect" value={selectedOption} onChange={handleChange}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default DropdownExample;