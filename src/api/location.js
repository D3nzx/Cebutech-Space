import { supabase } from '../lib/supabaseClient';


export const getLocations = async () => {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching locations:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { data: null, error: err.message };
  }
};


export const createLocation = async (locationData) => {
  try {
    const { data, error } = await supabase
      .from('locations')
      .insert([{
        location_code: locationData.location_code,
        name: locationData.name,
        building: locationData.building,
        room_number: locationData.room_number,
        capacity: locationData.capacity,
        type: locationData.type,
        floor: locationData.floor,
        description: locationData.description,
        is_available: locationData.is_available !== false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating location:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { data: null, error: err.message };
  }
};


export const updateLocation = async (id, locationData) => {
  try {
    const { data, error } = await supabase
      .from('locations')
      .update({
        location_code: locationData.location_code,
        name: locationData.name,
        building: locationData.building,
        room_number: locationData.room_number,
        capacity: locationData.capacity,
        type: locationData.type,
        floor: locationData.floor,
        description: locationData.description,
        is_available: locationData.is_available !== false
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating location:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { data: null, error: err.message };
  }
};


export const deleteLocation = async (id) => {
  try {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting location:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { error: err.message };
  }
};


export const searchLocations = async (query) => {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .or(`location_code.ilike.%${query}%,name.ilike.%${query}%,type.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching locations:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { data: null, error: err.message };
  }
};


export const checkLocationExists = async (name, excludeId = null) => {
  try {
    let query = supabase
      .from('locations')
      .select('id, name');

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query.eq('name', name);

    if (error) {
      console.error('Error checking location existence:', error);
      return { exists: false, error: error.message };
    }

    return { 
      exists: data.length > 0, 
      error: null 
    };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { exists: false, error: err.message };
  }
};
