const express = require("express");
const router = express.Router();
const Item = require("../../models/Item");
const Branch = require("../../models/Branch");
const Customer = require("../../models/Customer");
const Withdrawal = require("../../models/Withdrawal");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const { check, validationResult } = require("express-validator/check");
const { query } = require("../../utils/query");

router.use("/", require("./stock_status").router);

router.route("/get-all").get(async (req, res) => {
	const { limit, page, search_col, search_term, is_broken, status, type } = req.query;

	const filters = Item.filter({
		is_broken,
		status,
		type
	});

	// TODO: Join with bulk, model and supplier tables
	const q = await query({
		limit,
		page,
		search_col,
		search_term,
		cols: `${Item.getColumns}`,
		tables: `"item"`,
		where: filters,
		replacements: {
			status: status ? status.toUpperCase() : null,
			type
		},
		availableCols: [
			"serial_no",
			"status",
		]
	});
	if (q.errors) {
		res.status(500).json(q);
	} else {
		res.json(q);
	}
});

router.get("/:serial_no/details", (req, res) => {
	// TODO: Join with bulk, model and supplier tables
	const { serial_no } = req.params;
	Item.findOne({
		where: { serial_no: { [Op.eq]: serial_no } },
		include: [
			{
				model: Withdrawal,
				as: "withdrawals",
				include: [
					{
						model: Branch,
						as: "branch",
						include: {
							model: Customer,
							as: "customer"
						}
					}
				]
			},
			{
				model: Branch,
				as: "reserve_branch"
			}
		]
	})
		.then(item => {
			res.send({
				item
			});
		})
		.catch(err => console.log(err));
});

// Get lent items
router.get("/lent", async (req, res) => {
	const { limit, page, search_col, search_term, return_to, return_from } = req.query;
	let filters = null;
	if (return_from || return_to) {
		const f = return_from ? `"withdrawal"."return_by" >= :return_from` : null;
		const t = return_to ? `"withdrawal"."return_by" <= :return_to` : null;
		filters = [f, t].filter(e => e).join(" AND ");
	}

	const q = await query({
		limit,
		page,
		search_col,
		search_term,
		cols: `${Item.getColumns},
			${Withdrawal.getColumns},
			${Branch.getColumns},
			${Customer.getColumns},
			"tm"."return_by"`,
		tables: `"item"
		JOIN "withdrawal_has_item" ON "withdrawal_has_item"."serial_no" = "item"."serial_no"
		JOIN "withdrawal" ON "withdrawal_has_item"."withdrawal_id" = "withdrawal"."id"
		JOIN "branch" ON "withdrawal"."for_branch_code" = "branch"."branch_code"
		JOIN "customer" ON "branch"."owner_customer_code" = "customer"."customer_code"
		JOIN (
			SELECT "serial_no", max(withdrawal.return_by) AS "return_by"
			FROM "withdrawal"
			JOIN "withdrawal_has_item" ON "withdrawal_has_item"."withdrawal_id" = "withdrawal"."id"
			GROUP BY "serial_no"
		) "tm" ON "withdrawal"."return_by" = "tm"."return_by" AND "item"."serial_no" = "tm"."serial_no"
		`,
		where: `"item"."status" = 'LENT' 
			AND "withdrawal"."type" = 'LENDING' 
			${filters ? `AND ${filters}` : ""}`,
		replacements: {
			return_from,
			return_to,
		},
		availableCols: ["serial_no","branch_name","branch_code"]
	});
	if (q.errors) {
		res.status(500).json(q);
		console.log(q.errors);
	} else {
		res.json(q);
	}
});

// Get reserved items
router.get("/reserved", async (req, res) => {
	const { limit, page, search_col, search_term, type } = req.query;

	const typeFilter = Item.filter({ type });

	// TODO: Join with bulk, model and supplier tables
	const q = await query({
		limit,
		page,
		search_col,
		search_term,
		cols: `${Branch.getColumns}, ${Customer.getColumns}, ${Item.getColumns}`,
		tables: `"item"
		LEFT OUTER JOIN "branch" ON "item"."reserved_branch_code" = "branch"."branch_code"
		LEFT OUTER JOIN "customer" ON "branch"."owner_customer_code" = "customer"."customer_code"
		`,
		where: `"item"."status" = 'RESERVED' ${typeFilter ? `AND ${typeFilter}` : ""}`,
		replacements: {
			type
		},
		availableCols: [
			"serial_no",
			"status",
			"branch_code",
			"branch_name",
			"customer_code",
			"customer_name"
		]
	});
	if (q.errors) {
		res.status(500).json(q);
		console.log(q.errors)
	} else {
		res.json(q);
	}
});

// const stockValidation = [
// 	check("model_id")
// 		.not()
// 		.isEmpty()
// 		.withMessage("Model must be provided."),
// 	check("stock_location")
// 		.not()
// 		.isEmpty()
// 		.withMessage("Stock location must be provided."),
// 	check("po_number")
// 		.not()
// 		.isEmpty()
// 		.withMessage("PO number must be provided.")
// ];

// Edit Item
router.put("/:serial_no/edit", (req, res) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(422).json({ errors: errors.array() });
	}

	// TODO: able to change bulk (in case of human error when adding stock)
	const { serial_no } = req.params;
	const { remarks } = req.body;
	Item.update(
		{
			remarks
		},
		{
			where: {
				serial_no: {
					[Op.eq]: serial_no
				}
			}
		}
	)
		.then(rows => res.sendStatus(200))
		.catch(err => res.status(500).json({ errors: err }));
});

// Delete Item from Stock (superadmins only)
router.delete("/:serial_no", (req, res) => {
	const { serial_no } = req.params;
	Item.destroy({
		where: {
			serial_no: {
				[Op.eq]: serial_no
			}
		}
	})
		.then(rows => res.sendStatus(200))
		.catch(err => res.status(500).json({ errors: err }));
});

module.exports = router;
