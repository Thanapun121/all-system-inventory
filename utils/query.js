const pool = require("../config/database");

const checkColName = (name, cols) => {
	if (cols.indexOf(name) >= 0) {
		return true;
	}
	return false;
};

const getFromAlias = col => {
	switch (col) {
		case "customer_name":
			return `"customer"."name"`;
		case "branch_name":
			return `"branch"."name"`;
		case "model_code":
			return `"model"."model_code"`;
		case "model_name":
			return `"model"."name"`;
		case "withdrawal_type":
			return `"withdrawal"."type"`;
		case "withdrawal_date":
			return `"withdrawal"."date"`;
		case "withdrawal_status":
			return `"withdrawal"."status"`;
		case "serial_no":
			return `"item"."serial_no"`;
		case "product_type_name":
			return `"product_type"."type_name"`;
		case "supplier_name":
			return `"supplier"."name"`;
		case "staff_name":
			return `"staff"."name"`;
		case "department_name":
			return `"department"."name"`;
		default:
			return `"${col}"`;
	}
};

const correctValueString = (value, rep) => {
	switch (typeof value) {
		case "number":
			return value
		case "string":
			return `'${value}'`;
		case "boolean":
			return value ? "true" : "false";
		default:
			return value;
	}
}
const replaceReplacements = (string, replacements) => {
	let aString = string
	Object.keys(replacements).forEach(key => {
		aString = aString.replace(`:${key}`, correctValueString(replacements[key]));
	})
	return aString;
}

const buildString = (data) => {
	const { limit, page, cols, tables, availableCols, where, groupBy, replacements } = data;
	let { search_col, search_term } = data;
	if (search_term) {
		search_term = search_term.toLowerCase();
	}

	if (search_col && !checkColName(search_col, availableCols) && search_term) {
		search_col = null;
		search_term = null;
	}
	if (search_col) {
		search_col = getFromAlias(search_col);
	}

	let whereString = "";
	if (where || (search_col && search_term)) {
		const search =
			search_col && search_term ? `LOWER(${search_col}) LIKE LOWER(:search_term)` : null;
		whereString = `WHERE ${[where, search].filter(e => e).join(" AND ")}`;
	}

	let countString = `SELECT COUNT(*) 
	FROM ${tables} 
	${whereString}
	${groupBy ? groupBy : ""}
	`
	let queryString = `SELECT ${cols}
	FROM ${tables}
	${whereString}
	${groupBy ? groupBy : ""}
	${limit ? `LIMIT :limit` : ""}
	${limit && page ? `OFFSET :offset` : ""}`

	countString = replaceReplacements(countString, replacements);
	queryString = replaceReplacements(queryString, replacements);
	return {
		countString,
		queryString
	}
}

module.exports = {
	query: async function(data) {
		const { limit, page, cols, tables, availableCols, where, groupBy, replacements, search_col, search_term } = data;
		
		let count = 0;
		let response = [];
		let errors = [];

		const {
			countString,
			queryString
		} = buildString({
			limit, 
			page, 
			cols, 
			tables, 
			availableCols, 
			where, 
			groupBy, 
			replacements: {
				search_term: search_term ? `'%${search_term}%'` : "",
				limit,
				offset: limit * (page - 1),
				...replacements
			},
			search_col, 
			search_term
		})
		await pool
			.query(countString)
			.then(c => {
				count = c.rows[0].count;
			})
			.catch(err => {
				errors.push(err);
			});

		await pool
			.query(queryString)
			.then(r => {
				response = r.rows;
			})
			.catch(err => {
				errors.push(err);
			});
		if (errors.length > 0) {
			return {
				errors
			};
		}
		return {
			rows: response,
			count,
			pagesCount: limit ? Math.ceil(count / limit) : 1
		};
	},
	findOne: async function(data) {
		const { tables, cols, where, replacements } = data;
		let string = `
		SELECT ${cols}
		FROM ${tables}
		WHERE ${where}
		`;
		string = replaceReplacements(string, replacements);

		let errors = [];
		let response = [];

		await pool
			.query(string)
			.then(r => {
				response = r.rows;
			})
			.catch(err => {
				errors.push(err);
			});
		if (errors.length > 0) {
			return {
				errors
			};
		}
		return response[0];
	},
	insert: async function(data) {
		const { table, info } = data;
		let cols = [];
		let values = []
		Object.keys(info).forEach(key => {
			cols.push(`"${key}"`);
			values.push(correctValueString(info[key]));
		});
		const colString = `(${cols.join(", ")})`
		const valueString = `(${values.join(", ")})`

		let string = `
		INSERT INTO ${table} ${colString}
		VALUES ${valueString}
		`
		let errors = [];
		let response = [];

		await pool
			.query(string)
			.then(r => {
				response = r.rows;
			})
			.catch(err => {
				errors.push(err);
			});
		if (errors.length > 0) {
			return {
				errors
			};
		}
		return {
			rows: response,
		};
	},
	update: async function(data) {
		const { table, info, from, where, replacements } = data;

		let setArray = []
		Object.keys(info).forEach(key => {
			let value = info[key];
			setArray.push(`"${key}" = ${correctValueString(value)}`);
		})
		const setString = setArray.join(", ")

		let string = `
		UPDATE ${table}
		SET ${setString}
		${from ? `FROM ${from}` : ""}
		WHERE ${where}
		`
		string = replaceReplacements(string, replacements);

		let errors = [];
		let response = [];

		await pool
			.query(string)
			.then(r => {
				response = r.rows;
			})
			.catch(err => {
				errors.push(err);
			});
		if (errors.length > 0) {
			return {
				errors
			};
		}
		return {
			rows: response,
		};
	},
	del: async function(data) {
		const { table, using, from, where, replacements } = data;
		let string = `
		DELETE FROM ${table}
		${using ? `USING ${using}` : ""}
		WHERE ${where}
		`
		string = replaceReplacements(string, replacements);

		let errors = [];
		let response = [];

		await pool
			.query(string)
			.then(r => {
				response = r.rows;
			})
			.catch(err => {
				errors.push(err);
			});
		if (errors.length > 0) {
			return {
				errors
			};
		}
		return {
			rows: response,
		};
	}
};
