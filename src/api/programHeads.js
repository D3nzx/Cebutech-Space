import { supabase } from '../lib/supabaseClient';


export const getProgramHeads = async () => {
	try {
		const { data, error } = await supabase
			.from('program_heads')
			.select('id, first_name, last_name, email, college, program, program_head_code, contact_number, gender, address, is_active, created_at, updated_at')
			.order('created_at', { ascending: false });
		
		console.log('📚 getProgramHeads() called');
		console.log('   Raw response:', { data, error });
		
		if (error) {
			console.error('❌ Error fetching program heads:', error);
			return { data: null, error: error.message };
		}
		
		if (data) {
			console.log(`✅ Program heads loaded: ${data.length} records`);
			data.forEach(ph => {
				console.log(`   - ${ph.first_name} ${ph.last_name}: program="${ph.program}"`);
			});
		}
		
		return { data, error: null };
	} catch (err) {
		console.error('❌ Exception in getProgramHeads:', err);
		return { data: null, error: err.message };
	}
};


export const updateProgramHead = async (id, programHeadData) => {
	try {
		const { data, error } = await supabase
			.from('program_heads')
			.update({
				first_name: programHeadData.firstName,
				middle_name: programHeadData.middleName || null,
				last_name: programHeadData.lastName,
				email: programHeadData.email,
				contact_number: programHeadData.contact || null,
				gender: programHeadData.gender || null,
				address: programHeadData.address || null,
			})
			.eq('id', id)
			.select();
		if (error) return { data: null, error: error.message };
		return { data: data && data.length > 0 ? data[0] : null, error: null };
	} catch (err) {
		return { data: null, error: err.message };
	}
};


export const deleteProgramHead = async (id) => {
	try {
		console.log('Attempting to delete program head with ID:', id);
		const { error, data } = await supabase.from('program_heads').delete().eq('id', id);
		
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


export const disableProgramHeadAccount = async (id) => {
	try {
		console.log('🔒 Disabling program head account:', id);
		const { data, error } = await supabase
			.from('program_heads')
			.update({ is_active: false })
			.eq('id', id)
			.select();
		
		if (error) {
			console.error('❌ Error disabling program head account:', error);
			return { data: null, error: error.message };
		}
		
		console.log('✅ Program head account disabled:', data?.[0]?.program_head_code);
		return { data: data && data.length > 0 ? data[0] : null, error: null };
	} catch (err) {
		console.error('❌ Exception disabling program head account:', err);
		return { data: null, error: err.message };
	}
};


export const enableProgramHeadAccount = async (id) => {
	try {
		console.log('🔓 Enabling program head account:', id);
		const { data, error } = await supabase
			.from('program_heads')
			.update({ is_active: true })
			.eq('id', id)
			.select();
		
		if (error) {
			console.error('❌ Error enabling program head account:', error);
			return { data: null, error: error.message };
		}
		
		console.log('✅ Program head account enabled:', data?.[0]?.program_head_code);
		return { data: data && data.length > 0 ? data[0] : null, error: null };
	} catch (err) {
		console.error('❌ Exception enabling program head account:', err);
		return { data: null, error: err.message };
	}
};


export const checkProgramHeadExists = async (email, excludeId = null) => {
	try {
		let query = supabase.from('program_heads').select('id, email');
		if (excludeId) query = query.neq('id', excludeId);
		const { data, error } = await query.eq('email', email);
		if (error) return { exists: false, error: error.message };
		return { exists: data && data.length > 0, error: null };
	} catch (err) {
		return { exists: false, error: err.message };
	}
};
