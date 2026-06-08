"use client";

import { useTransition } from "react";
import { updateTransactionClassification } from "@/app/actions/transactions";
import { classificationOptionClass, classificationSelectClass } from "@/lib/classification-styles";
import {
  TRANSACTION_CLASSIFICATIONS,
  type TransactionClassification,
} from "@/lib/classifications";

export function ClassificationSelect({
  transactionId,
  value,
}: {
  transactionId: string;
  value: string;
}) {
  const [pending, startTransition] = useTransition();
  const selected =
    TRANSACTION_CLASSIFICATIONS.find((option) => option === value) ??
    "uncategorized";

  return (
    <select
      value={selected}
      disabled={pending}
      className={`input select-class ${classificationSelectClass(selected)} disabled:opacity-50`}
      onChange={(event) => {
        const classification = event.target.value as TransactionClassification;
        startTransition(async () => {
          await updateTransactionClassification(transactionId, classification);
        });
      }}
    >
      <option value="uncategorized" className={classificationOptionClass("uncategorized")}>
        Uncategorized
      </option>
      <option value="business" className={classificationOptionClass("business")}>
        Business
      </option>
      <option value="personal" className={classificationOptionClass("personal")}>
        Personal
      </option>
      <option value="payment" className={classificationOptionClass("payment")}>
        Payment
      </option>
    </select>
  );
}
