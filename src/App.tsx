import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DropdownExample from "./Dropdown";
import WarehousesTable from './components/TWarehouses';
import TEmployees from "./components/TEmployees";
import TProducts from "./components/TProducts";
import TPositions from "./components/TPositions";
import TProductsIncome from "./components/TProductsIncome";
import TProductsOutcome from "./components/TProductsOutcome";
import TIncomeNotes from "./components/TIncomeNotes";
import TOutcomeNotes from "./components/TOutcomeNotes";
import IntegratedReportComponent from "./components/integrated-report";

const queryClient = new QueryClient();

const App = () => {
    const [selectedOption, setSelectedOption] = useState(() => {
        return localStorage.getItem('selectedOption') || 'option1';
    });

    useEffect(() => {
        localStorage.setItem('selectedOption', selectedOption);
    }, [selectedOption]);

    const handleSelect = (option: string) => {
        setSelectedOption(option);
    };

    const renderComponent = () => {
        switch (selectedOption) {
            case 'option1':
                return <WarehousesTable />;
            case 'option2':
                return <TEmployees />;
            case 'option3':
                return <TPositions />;
            case 'option4':
                return <TProducts />;
            case 'option5':
                return <TProductsIncome />;
            case 'option6':
                return <TIncomeNotes />;
            case 'option7':
                return <TProductsOutcome />;
            case 'option8':
                return <TOutcomeNotes />;
            case 'option9':
                return <IntegratedReportComponent />;
            default:
                return <WarehousesTable />;
        }
    };

    return (
        <div>
            <QueryClientProvider client={queryClient}>
                <DropdownExample onSelect={handleSelect} selectedOption={selectedOption} />
                {renderComponent()}
            </QueryClientProvider>
        </div>
    );
};

export default App;