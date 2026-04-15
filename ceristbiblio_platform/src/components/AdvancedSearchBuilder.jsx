import { useState, useContext } from "react";
import { FaPlus, FaTrash, FaSearch } from "react-icons/fa";
import { SearchContext } from "../context/SearchContextExport";

function AdvancedSearchBuilder({ onSearch }) {
  const { source, setSource } = useContext(SearchContext);
  const [criteria, setCriteria] = useState([
    { id: 1, searchBy: "author", value: "", operator: "-" }
  ]);
  const [nextId, setNextId] = useState(2);
  const [loading, setLoading] = useState(false);

  const searchByOptions = [
    { value: "author", label: "Author" },
    { value: "domain", label: "Domain/Field" },
    { value: "country", label: "Country" },
    { value: "lab", label: "Lab/Institution" }
  ];

  const operatorOptions = [
    { value: "-", label: "- (First)" },
    { value: "or", label: "OR" },
    { value: "and", label: "AND" }
  ];

  const handleAddCriteria = () => {
    setCriteria([
      ...criteria,
      { id: nextId, searchBy: "author", value: "", operator: "or" }
    ]);
    setNextId(nextId + 1);
  };

  const handleRemoveCriteria = (id) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter(c => c.id !== id));
    }
  };

  const handleCriteriaChange = (id, field, value) => {
    setCriteria(criteria.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    // Get first criteria with value
    const firstCriteria = criteria.find(c => c.value.trim());
    
    if (!firstCriteria) {
      alert("Please enter at least one search term");
      return;
    }

    setLoading(true);
    try {
      if (onSearch) {
        await onSearch({
          criteria: criteria.filter(c => c.value.trim()),
          primaryQuery: firstCriteria.value
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="advanced-search-builder">
      <div className="source-selector">
        <label htmlFor="source">Data Source: </label>
        <select 
          id="source"
          value={source} 
          onChange={(e) => setSource(e.target.value)}
          className="source-select"
        >
          <option value="openalex">OpenAlex</option>
          <option value="pubmed">PubMed</option>
        </select>
      </div>
      <form onSubmit={handleSearch} className="search-form">
        <div className="criteria-list">
          {criteria.map((criterion, index) => (
            <div key={criterion.id} className="criteria-row">
              {/* Operator (hidden for first, visible for others) */}
              {index > 0 && (
                <div className="operator-wrapper">
                  <select
                    value={criterion.operator}
                    onChange={(e) => handleCriteriaChange(criterion.id, "operator", e.target.value)}
                    className="operator-select"
                  >
                    {operatorOptions.filter(op => op.value !== "-").map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {index === 0 && <div className="operator-placeholder"></div>}

              {/* Search By Dropdown */}
              <div className="searchby-wrapper">
                <select
                  value={criterion.searchBy}
                  onChange={(e) => handleCriteriaChange(criterion.id, "searchBy", e.target.value)}
                  className="searchby-select"
                >
                  {searchByOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Input Field */}
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder={`Enter ${criteria.find(c => c.searchBy === criterion.searchBy)?.label || "search term"}`}
                  value={criterion.value}
                  onChange={(e) => handleCriteriaChange(criterion.id, "value", e.target.value)}
                  className="search-input"
                  disabled={loading}
                />
              </div>

              {/* Remove Button */}
              {criteria.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveCriteria(criterion.id)}
                  className="remove-btn"
                  disabled={loading}
                  title="Remove this criteria"
                >
                  <FaTrash />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="actions-row">
          <button
            type="button"
            onClick={handleAddCriteria}
            className="add-criteria-btn"
            disabled={loading}
            title="Add another search criteria"
          >
            <FaPlus /> Add Criteria
          </button>

          <button
            type="submit"
            className="search-btn-submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <FaSearch className="spinning" /> Searching...
              </>
            ) : (
              <>
                <FaSearch /> Search
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdvancedSearchBuilder;
