import { supabase } from '../lib/supabaseClient';


export const getFaculty = async () => {
	try {
		const { data, error } = await supabase
			.from('faculty')
			.select('id, first_name, last_name, email, college, program, id_no, contact_number, gender, address, is_active, created_at, updated_at')
			.order('created_at', { ascending: false });
		
		console.log('📚 getFaculty() called');
		console.log('   Raw response:', { data, error });
		
		if (error) {
			console.error('❌ Error fetching faculty:', error);
			return { data: null, error: error.message };
		}
		
		if (data) {
			console.log(`✅ Faculty loaded: ${data.length} records`);
			data.forEach(fac => {
				console.log(`   - ${fac.first_name} ${fac.last_name}: program="${fac.program}"`);
			});
		}
		
		return { data, error: null };
	} catch (err) {
		console.error('❌ Exception in getFaculty:', err);
		return { data: null, error: err.message };
	}
};


export const createFaculty = async (facultyData) => {
	try {
		const { data, error } = await supabase
			.from('faculty')
			.insert([
				{
					id_no: facultyData.idNo,
					first_name: facultyData.firstName,
					middle_name: facultyData.middleName || null,
					last_name: facultyData.lastName,
					email: facultyData.email,
					contact_number: facultyData.contact || null,
					gender: facultyData.gender || null,
					address: facultyData.address || null,
				},
			])
			.select();
		if (error) return { data: null, error: error.message };
		return { data: data && data.length > 0 ? data[0] : null, error: null };
	} catch (err) {
		return { data: null, error: err.message };
	}
};


export const updateFaculty = async (id, facultyData) => {
	try {
		const { data, error } = await supabase
			.from('faculty')
			.update({
				id_no: facultyData.idNo,
				first_name: facultyData.firstName,
				middle_name: facultyData.middleName || null,
				last_name: facultyData.lastName,
				email: facultyData.email,
				contact_number: facultyData.contact || null,
				gender: facultyData.gender || null,
				address: facultyData.address || null,
			})
			.eq('id', id)
			.select();
		if (error) return { data: null, error: error.message };
		return { data: data && data.length > 0 ? data[0] : null, error: null };
	} catch (err) {
		return { data: null, error: err.message };
	}
};


export const deleteFaculty = async (id) => {
	try {
		console.log('Attempting to delete faculty with ID:', id);
		const { error, data } = await supabase.from('faculty').delete().eq('id', id);
		
		if (error) {
			console.error('Delete error:', error);
			return { error: error.message };
		}
		
		console.log('Delete successful, returned data:', data);
		return { error: null };
	} catch (err) {
		console.error('Delete exception:', err);
		return { error: err.message };
	}
};


export const searchFaculty = async (query) => {
	try {
		const { data, error } = await supabase
			.from('faculty')
			.select('*')
			.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,id_no.ilike.%${query}%`)
			.order('created_at', { ascending: false });
		if (error) return { data: null, error: error.message };
		return { data, error: null };
	} catch (err) {
		return { data: null, error: err.message };
	}
};


export const checkFacultyExists = async (email, idNo, excludeId = null) => {
	try {
		let query = supabase.from('faculty').select('id, email, id_no');
		if (excludeId) query = query.neq('id', excludeId);
		const { data, error } = await query.or(`email.eq.${email},id_no.eq.${idNo}`);
		if (error) return { exists: false, error: error.message };
		const emailExists = data.some((f) => f.email === email);
		const idNoExists = data.some((f) => f.id_no === idNo);
		return { exists: emailExists || idNoExists, emailExists, idNoExists, error: null };
	} catch (err) {
		return { exists: false, error: err.message };
	}
};


export const disableFacultyAccount = async (id) => {
	try {
		console.log('🔒 Disabling faculty account:', id);
		const { data, error } = await supabase
			.from('faculty')
			.update({ is_active: false })
			.eq('id', id)
			.select();
		
		if (error) {
			console.error('❌ Error disabling faculty account:', error);
			return { data: null, error: error.message };
		}
		
		console.log('✅ Faculty account disabled:', data?.[0]?.id_no);
		return { data: data && data.length > 0 ? data[0] : null, error: null };
	} catch (err) {
		console.error('❌ Exception disabling faculty account:', err);
		return { data: null, error: err.message };
	}
};


export const enableFacultyAccount = async (id) => {
	try {
		console.log('🔓 Enabling faculty account:', id);
		const { data, error } = await supabase
			.from('faculty')
			.update({ is_active: true })
			.eq('id', id)
			.select();
		
		if (error) {
			console.error('❌ Error enabling faculty account:', error);
			return { data: null, error: error.message };
		}
		
		console.log('✅ Faculty account enabled:', data?.[0]?.id_no);
		return { data: data && data.length > 0 ? data[0] : null, error: null };
	} catch (err) {
		console.error('❌ Exception enabling faculty account:', err);
		return { data: null, error: err.message };
	}
};
