import Web3 from "web3";
//import { AbiItem } from "@celo/utils/node_modules/web3-utils";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import erc20_Json from '../contracts/IERC20Token.json';
import multiSigWallet_Json from '../contracts/MultiSigwallet.json'

// eslint-disable-next-line
import { updateTypeAliasDeclaration } from "typescript";
//import { values } from "lodash";

const ERC20_DECIMALS = 18
const TruffleContract = require("@truffle/contract")

const MultiSigWalletJson = TruffleContract(multiSigWallet_Json);

const IERC20Json = TruffleContract(erc20_Json);

const MWContractAddress = "0xB7909B023118D5930E3F020fB614a30021d79DA9"
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"

interface Transaction {
  txIndex: number;
  to: string;
  amount: BigNumber;
  purpose: string;
  executed: boolean;
  numConfirmations: number;
  isConfirmedByCurrentAccount: boolean;
}

interface GetResponse {
  address: string;
  balance: string;
  owners: string[];
  numConfirmationsRequired: number;
  transactionCount: number;
  transactions: Transaction[];
}

async function approve(web3: Web3, account: string, amount: string) {

  const kit = newKitFromWeb3(web3);

  const cUSDContract = new kit.web3.eth.Contract(IERC20Json.abi, cUSDContractAddress);

  // eslint-disable-next-line
  const result = await cUSDContract.methods
    .approve(MWContractAddress, amount)
    .send({ from: account})
  return result
}

export async function get(web3: Web3, account: string): Promise<GetResponse> {
  const kit = newKitFromWeb3(web3);

  const contract = new kit.web3.eth.Contract(MultiSigWalletJson.abi, MWContractAddress)

  const balance = await contract.methods.getBalance().call();

  const owners = await contract.methods.getOwners().call()

  const numConfirmationsRequired = await contract.methods.getNumConfirmationsRequired().call()
 
  const transactionCount = await contract.methods.getTransactionCount().call();

  // get 10 most recent tx
  const count = transactionCount
  const transactions: Transaction[] = [];
  for (let i = 1; i <= 10; i++) {
    const txIndex = count - i;
    if (txIndex < 0) {
      break;
    }

    const tx = await contract.methods.getTransaction(txIndex).call();
    
    const isConfirmed = await contract.methods.isConfirmed(txIndex, account).call();

    transactions.push({
      txIndex,
      to: tx.to,
      amount: tx.amount,
      purpose: tx.purpose,
      executed: tx.executed,
      numConfirmations: tx.numConfirmations,
      isConfirmedByCurrentAccount: isConfirmed,
    });
  }

  return {
    address: MWContractAddress,
    balance,
    owners,
    numConfirmationsRequired: numConfirmationsRequired,
    transactionCount: count,
    transactions,
  };
}

export async function deposit(
  web3: Web3,
  account: string,
  params: {
    amount: number;
  }
) {
  const { amount } = params;
  const _amount = new BigNumber(amount).shiftedBy(ERC20_DECIMALS);
  // NOTE: error when passing BigNumber type, so pass string
  const _amountString = _amount.toString()

  const kit = newKitFromWeb3(web3);

  const contract = new kit.web3.eth.Contract(MultiSigWalletJson.abi, MWContractAddress);
  
  let isApproved = true;

  try {
    await approve(web3, account, _amountString)
  } catch (error) {
    alert(`⚠️ ${error}.`)
    isApproved = false;
  }

  if(isApproved){
    // eslint-disable-next-line
    const result = await contract.methods
    .deposit(_amountString)
    .send({ from: account})
  }else{
    alert('Please approve contract to be able to spend cUSD from your wallet')
  }
}

export async function submitTx(
  web3: Web3,
  account: string,
  params: {
    to: string;
    // NOTE: error when passing BigNumber type, so pass string
    amount: string;
    purpose: string;
  }
) {
  const kit = newKitFromWeb3(web3);
  const { to, amount, purpose } = params;

  const contract = new kit.web3.eth.Contract(MultiSigWalletJson.abi, MWContractAddress)

  try {
    
    const _amount = new BigNumber(amount).shiftedBy(ERC20_DECIMALS)
    const _amountString = _amount.toString()
    // eslint-disable-next-line
    const result = await contract.methods
      .submitTransaction(to, _amountString, purpose)
      .send({ from: account })
  } catch (error) {
    alert(`⚠️ ${error}.`)
  }
}

export async function confirmTx(
  web3: Web3,
  account: string,
  params: {
    txIndex: number;
  }
) {
  const kit = newKitFromWeb3(web3);
  const { txIndex } = params;

  const contract = new kit.web3.eth.Contract(MultiSigWalletJson.abi, MWContractAddress)

  try {
    // eslint-disable-next-line
    const result = await contract.methods
      .confirmTransaction(txIndex)
      .send({ from: account })
  } catch (error) {
    alert(`⚠️ ${error}.`)
  }
}

export async function revokeConfirmation(
  web3: Web3,
  account: string,
  params: {
    txIndex: number;
  }
) {
  const kit = newKitFromWeb3(web3);
  const { txIndex } = params;

  const contract = new kit.web3.eth.Contract(MultiSigWalletJson.abi, MWContractAddress)

  try {
    // eslint-disable-next-line
    const result = await contract.methods
      .revokeConfirmation(txIndex)
      .send({ from: account })
  } catch (error) {
    alert(`⚠️ ${error}.`)
  }
}

export async function executeTx(
  web3: Web3,
  account: string,
  params: {
    txIndex: number;
  }
) {
  const kit = newKitFromWeb3(web3);
  const { txIndex } = params;

  const contract = new kit.web3.eth.Contract(MultiSigWalletJson.abi, MWContractAddress)

  try {
    // eslint-disable-next-line
    const result = await contract.methods
      .executeTransaction(txIndex)
      .send({ from: account })
  } catch (error) {
    alert(`⚠️ ${error}.`)
  }
}

export function subscribe(
  web3: Web3,
  address: string,
  callback: (error: Error | null, log: Log | null) => void
) {
  const kit = newKitFromWeb3(web3);

  const multiSig = new kit.web3.eth.Contract(MultiSigWalletJson.abi, address);

  const res = multiSig.events.allEvents((error: Error, log: Log) => {
    if (error) {
      callback(error, null);
    } else if (log) {
      callback(null, log);
    }
  });

  return () => res.unsubscribe();
}

interface Deposit {
  event: "Deposit";
  returnValues: {
    sender: string;
    amount: string;
    balance: string;
  };
}

interface SubmitTransaction {
  event: "SubmitTransaction";
  returnValues: {
    owner: string;
    txIndex: string;
    to: string;
    amount: string;
    purpose: string;
  };
}

interface ConfirmTransaction {
  event: "ConfirmTransaction";
  returnValues: {
    owner: string;
    txIndex: string;
  };
}

interface RevokeConfirmation {
  event: "RevokeConfirmation";
  returnValues: {
    owner: string;
    txIndex: string;
  };
}


interface ExecuteTransaction {
  event: "ExecuteTransaction";
  returnValues: {
    owner: string;
    txIndex: string;
  };
}

interface Withdrawal {
  event: "Withdrawal";
  returnValues: {
    owner: string;
    balance: string;
  }
}

type Log =
  | Deposit
  | SubmitTransaction
  | ConfirmTransaction
  | RevokeConfirmation
  | ExecuteTransaction
  | Withdrawal;
