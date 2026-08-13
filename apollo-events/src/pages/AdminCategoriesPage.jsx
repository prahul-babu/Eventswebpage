import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Building, Plus, Check } from 'lucide-react';
import API from '../services/api';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Category
  const [newCat, setNewCat] = useState({ name: '', description: '', color: '#1789A5' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, schRes] = await Promise.all([
        API.get('/admin/categories'),
        API.get('/admin/schools')
      ]);
      setCategories(catRes.data);
      setSchools(schRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categories & schools:', error);
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await API.post('/admin/categories', newCat);
      setNewCat({ name: '', description: '', color: '#1789A5' });
      fetchData();
    } catch (error) {
      alert('Failed to add category');
    }
  };

  return (
    <div className="min-h-screen bg-apollo-light pb-20">
      
      {/* Header */}
      <div className="bg-apollo-dark text-white py-8 border-b-4 border-apollo-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <span className="text-apollo-gold text-xs font-bold uppercase tracking-wider">
              System Configuration
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white mt-1">
              Event Categories & University Schools
            </h1>
          </div>
          <Link to="/admin/dashboard" className="text-xs text-apollo-gold hover:underline">
            ← Back to Overview
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Categories Box */}
        <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo space-y-6">
          <h2 className="text-xl font-bold font-display text-apollo-navy flex items-center gap-2 border-b pb-3">
            <Layers className="w-5 h-5 text-apollo-teal" />
            Configured Event Categories
          </h2>

          <form onSubmit={handleAddCategory} className="flex gap-3 text-xs">
            <input
              type="text"
              required
              placeholder="New Category Name (e.g. Hackathon)"
              value={newCat.name}
              onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
              className="flex-1 bg-apollo-light border p-2.5 rounded-xl font-medium"
            />
            <button type="submit" className="gold-gradient-btn px-4 py-2 rounded-xl text-apollo-dark font-bold">
              + Add
            </button>
          </form>

          <div className="space-y-2">
            {categories.map(cat => (
              <div key={cat._id} className="p-3.5 rounded-xl bg-apollo-light border border-apollo-border flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-apollo-dark text-sm">{cat.name}</h4>
                  <p className="text-xs text-gray-500">{cat.description || 'University event category'}</p>
                </div>
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color || '#1789A5' }}></span>
              </div>
            ))}
          </div>
        </div>

        {/* Schools Box */}
        <div className="bg-white rounded-2xl p-6 border border-apollo-border shadow-apollo space-y-6">
          <h2 className="text-xl font-bold font-display text-apollo-navy flex items-center gap-2 border-b pb-3">
            <Building className="w-5 h-5 text-apollo-gold" />
            Active University Schools
          </h2>

          <div className="space-y-3">
            {schools.map(sch => (
              <div key={sch._id} className="p-4 rounded-xl bg-apollo-light border border-apollo-border space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-apollo-navy text-sm">{sch.name}</h4>
                  <span className="text-xs font-bold text-apollo-gold bg-apollo-navy px-2 py-0.5 rounded">{sch.code}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Departments: {sch.departments?.join(', ') || 'All Departments'}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
