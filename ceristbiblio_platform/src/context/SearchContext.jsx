import { useState } from "react";
import { SearchContext } from "./SearchContextExport";

export function SearchProvider({ children }) {
    const [results, setResults] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAuthor , setSelectedAuthor] = useState(null);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [searchCriteria, setSearchCriteria] = useState(null);
    const [source, setSource] = useState("openalex");

    const updateResults = (newResults, total = 0) => {
        setResults(newResults || []);
        setSelectedAuthor(null);
        setError(null);
        setTotalResults(total);
        setCurrentPage(1);
        setHasMore(total > (newResults?.length || 0));
    };

    const appendResults = (newResults) => {
        setResults(prev => [...prev, ...(newResults || [])]);
        setCurrentPage(prev => prev + 1);
    };

    const clearSearch = () => {
        setResults([]);
        setSearchQuery("");
        setSelectedAuthor(null);
        setError(null);
        setCurrentPage(1);
        setTotalResults(0);
        setHasMore(false);
        setSearchCriteria(null);
        setSource("openalex");
    };

    return (
        <SearchContext.Provider value={{ 
            results, 
            setResults: updateResults,
            appendResults,
            loading,
            setLoading,
            searchQuery,
            setSearchQuery,
            selectedAuthor,
            setSelectedAuthor, 
            error,
            setError,
            clearSearch,
            currentPage,
            setCurrentPage,
            totalResults,
            setTotalResults,
            hasMore,
            setHasMore,
            searchCriteria,
            setSearchCriteria,
            source,
            setSource
            }}>
            {children}
        </SearchContext.Provider>
    );
};
