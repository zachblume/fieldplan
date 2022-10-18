const data = [
  {
    fieldName: "ContactsContactID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "VanID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "ResultID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "CanvassedBy",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "CommitteeID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "CreatedBy",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "DateCreated",
    fieldType: "D",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "DateCanvassed",
    fieldType: "D",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "InputTypeID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "ContactTypeID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "ChangeTypeId",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: [
      {
        id: "1",
        name: "Created",
      },
    ],
  },
];

const data_acs = [
  {
    fieldName: "ActivistCodeID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
    bulkImportFields: [
      {
        mappingTypeName: "ActivistCode",
        fieldName: "ActivistCodeID",
      },
    ],
  },
  {
    fieldName: "ContactsActivistCodeID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "ChangeTypeID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: [
      {
        id: "1",
        name: "Created",
      },
      {
        id: "3",
        name: "Deleted",
      },
    ],
  },
  {
    fieldName: "CommitteeID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "IsDeleted",
    fieldType: "B",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "VanID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
    bulkImportFields: [
      {
        mappingTypeName: "ActivistCode",
        fieldName: "VanID",
      },
    ],
  },
];

const data_sqs = [
  {
    fieldName: "ContactsSurveyResponseID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "VanID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "SurveyQuestionID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "SurveyResponseID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "CanvassedBy",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "DateCanvassed",
    fieldType: "D",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "CommitteeID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "CreatedBy",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "DateCreated",
    fieldType: "D",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "ContactsContactID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "InputTypeID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
  {
    fieldName: "ContactTypeID",
    fieldType: "N",
    maxTextboxCharacters: null,
    isCoreField: true,
    availableValues: null,
  },
];

console.log("\n\ncontacts\n");
data.forEach((a) => process.stdout.write("" + a.fieldName + ":STRING,\n"));
console.log("\n\nactivistcodes\n");
data_acs.forEach((a) => process.stdout.write("" + a.fieldName + ":STRING,\n"));
console.log("\n\nsurveyqesutions\n");
data_sqs.forEach((a) => process.stdout.write("" + a.fieldName + ":STRING,\n"));
console.log("\n\nend");
