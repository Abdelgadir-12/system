
import { useState, useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";


const Pets = () => {
  const [pets, setPets] = useState<any[]>([]);
  const { user, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecies, setFilterSpecies] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [useLocal, setUseLocal] = useState(false);

  useEffect(() => {
    loadPets();
    // eslint-disable-next-line
  }, [useLocal]);

  const loadPets = async () => {
    try {
      setIsLoading(true);
      if (useLocal) {
        let petsFromLocal = [];
        // If not admin, filter by owner_id
        if (!isAdmin && user) {
          petsFromLocal = petsFromLocal.filter(pet => pet.owner_id === user.id);
        }
        setPets(petsFromLocal);
      } else {
        // Fetch from Supabase REST API
        if (!user) {
          setPets([]);
          setIsLoading(false);
          return;
        }
        const SUPABASE_URL = "https://ztubrfjqsckplmelezws.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0dWJyZmpxc2NrcGxtZWxlendzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMDQ5NjcsImV4cCI6MjA2NTg4MDk2N30.qyjJEwQKzk6t0tdSmRYZghBG1GMAE-2Y4g3obbwblr0";
        
        // Fetch pets
        let petsUrl = `${SUPABASE_URL}/rest/v1/pets?select=*&order=created_at.desc`;
        if (!isAdmin) {
          petsUrl += `&owner_id=eq.${user.id}`;
        }
        const petsResponse = await fetch(petsUrl, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        if (!petsResponse.ok) {
          throw new Error(`Failed to fetch pets: ${petsResponse.status}`);
        }
        const petsFromDB = await petsResponse.json();
        
        // Fetch all profiles to get owner information
        const profilesUrl = `${SUPABASE_URL}/rest/v1/profiles?select=id,name,email`;
        const profilesResponse = await fetch(profilesUrl, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        
        if (profilesResponse.ok) {
          const profiles = await profilesResponse.json();
          // Create a map of owner_id to owner info
          const ownerMap = new Map(profiles.map((p: any) => [p.id, { name: p.name, email: p.email }]));
          
          // Map pets with owner information
          const petsWithOwners = petsFromDB.map((pet: any) => {
            const owner = ownerMap.get(pet.owner_id);
            return {
              ...pet,
              owner_name: owner?.name || 'Unknown',
              owner_email: owner?.email || ''
            };
          });
          
          setPets(petsWithOwners);
        } else {
          // If profiles fetch fails, just use pets without owner info
          setPets(petsFromDB);
        }
      }
    } catch (error) {
      console.error('❌ Error loading pets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    
    let years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
      years--;
    }
    
    if (years < 1) {
      const totalMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
      return totalMonths === 1 ? "1 month" : `${totalMonths} months`;
    } else {
      return years === 1 ? "1 year" : `${years} years`;
    }
  };

  const filteredPets = pets.filter(pet => {
    // Filter by search term
    const searchMatch = 
      pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pet.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (pet.breed?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      pet.id.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by species
    const speciesMatch = filterSpecies === "All" || pet.type === filterSpecies.toLowerCase();

    return searchMatch && speciesMatch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pets Registry</h2>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={useLocal}
              onChange={() => setUseLocal((v) => !v)}
            />
            Use LocalStorage
          </label>
          <button
            onClick={loadPets}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-grow">
          <input
            type="text"
            placeholder="Search pets..."
            className="w-full px-4 py-2 border rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border rounded-md"
          value={filterSpecies}
          onChange={(e) => setFilterSpecies(e.target.value)}
        >
          <option value="All">All Species</option>
          <option value="Dog">Dogs</option>
          <option value="Cat">Cats</option>
          <option value="Bird">Birds</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Pets Table */}
      <div className="border rounded-md overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Species</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Breed</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Age</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Owner</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                  </td>
                </tr>
              ))
            ) : (
              filteredPets.map((pet) => (
                <tr key={pet.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{pet.id}</td>
                  <td className="px-4 py-3 text-sm font-medium">{pet.name}</td>
                  <td className="px-4 py-3 text-sm capitalize">{pet.type}</td>
                  <td className="px-4 py-3 text-sm">{pet.breed || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{calculateAge(pet.birth_date)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <div>{pet.owner_name || 'Unknown'}</div>
                      <div className="text-gray-500 text-xs">{pet.owner_email || ''}</div>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!isLoading && filteredPets.length === 0 && (
              <tr className="border-t">
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  No pets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {!isLoading && filteredPets.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {filteredPets.length} of {pets.length} pets
        </div>
      )}
    </div>
  );
};

export default Pets;