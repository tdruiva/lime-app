import { map } from 'rxjs/operators';

export const getNotes = (api, sid) => api.call(sid, 'lime-utils', 'get_notes', { }).pipe(
	map(x => {
		if (typeof x.notes === 'undefined') {
			throw { error: true };
		}
		return x;
	})
);

export const setNotes = (api, sid, notes) => api.call(sid, 'lime-utils', 'set_notes', notes);