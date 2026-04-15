import { useContext } from "react";
import { SearchContext } from "./SearchContextExport";

export const useSearch = () => useContext(SearchContext);
