// Manage the extension's state and open Side Panel on click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

console.log("JGoblin background script loaded.");

// Create Context Menus
chrome.runtime.onInstalled.addListener(() => {
  // Parent Menu
  chrome.contextMenus.create({
    id: "jgoblinParent",
    title: "JGoblin",
    contexts: ["selection"]
  });

  // Sub-menus
  chrome.contextMenus.create({
    id: "setCompanyName",
    parentId: "jgoblinParent",
    title: "Set as Company Name",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "setJobDescription",
    parentId: "jgoblinParent",
    title: "Set as Job Description",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "setJobRole",
    parentId: "jgoblinParent",
    title: "Set as Job Role",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "addQuestion",
    parentId: "jgoblinParent",
    title: "Add as Question",
    contexts: ["selection"]
  });
});

// Handle Context Menu Click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const text = info.selectionText;
  if (!text) return;

  if (info.menuItemId === "setCompanyName") {
    chrome.storage.local.set({ companyName: text });
  } 
  else if (info.menuItemId === "setJobRole") {
    chrome.storage.local.set({ jobRole: text });
  }
  else if (info.menuItemId === "setJobDescription") {
    chrome.storage.local.set({ jobDescription: text });
  } 
  else if (info.menuItemId === "addQuestion") {
    // Append to existing questions
    chrome.storage.local.get({ questions: "" }, (result) => {
      let currentQuestions = result.questions || "";
      // Add newline if not empty
      if (currentQuestions.trim().length > 0) {
        currentQuestions += "\n";
      }
      currentQuestions += text;
      
      chrome.storage.local.set({ questions: currentQuestions });
    });
  }
});
