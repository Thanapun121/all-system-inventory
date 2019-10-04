import React from "react";
import { Route, Switch } from "react-router-dom";
import Branch from "./pages/branch/";
import Item from "./pages/item/";
import Customer from "./pages/customer/";
import Withdrawal from "./pages/withdrawal/";
import AddItemsToWithdrawal from "./pages/withdrawal/addItems";
import FetchDataFromServer from "@/common/components/FetchDataFromServer";

class Single extends React.Component {
	render() {
		return (
			<div className="content">
				<Switch>
					<Route path="/single/branch/:branch_id" component={BranchPage} />
					<Route path="/single/item/:serial_no" component={ItemPage} />
					<Route path="/single/customer/:customer_code" component={CustomerPage} />
					<Route
						path="/single/withdrawal/:id/add-items"
						component={AddItemsToWithdrawal}
					/>
					<Route path="/single/withdrawal/:id" component={WithdrawalPage} />
				</Switch>
			</div>
		);
	}
}

const BranchPage = props => {
	const { branch_id } = props.match.params;
	return (
		<FetchDataFromServer
			url={`/branch/${branch_id}/details`}
			render={data => <Branch data={data} />}
		/>
	);
};

const ItemPage = props => {
	const { serial_no } = props.match.params;
	return (
		<FetchDataFromServer
			url={`/stock/${serial_no}/details`}
			render={data => <Item data={data} />}
		/>
	);
};

const CustomerPage = props => {
	const { customer_code } = props.match.params;
	return (
		<FetchDataFromServer
			url={`/customer/${customer_code}/details`}
			render={data => <Customer data={data} />}
		/>
	);
};

const WithdrawalPage = props => {
	const { id } = props.match.params;
	return (
		<FetchDataFromServer
			url={`/withdrawal/${id}/details`}
			render={data => <Withdrawal data={data} id={id} />}
		/>
	);
};

export default Single;