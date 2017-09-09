/**
 * Your Add-In code goes inside the addinTemplate function. This is the constructor for your Add-In.
 *
 * This function will automatically get called to construct your Add-In by MyGeotab at the right time.  You need to
 * return a function  that contains three methods: initialize(), focus() and blur(). These will be called at the
 * appropriate times during the life of the Add-In.
 *
 * @param api The GeotabApi object for making calls to MyGeotab.
 * @param state The state object allows access to URL, page navigation and global group filter.
 * @returns {{initialize: Function, focus: Function, blur: Function}}
 */
geotab.addin.addinTemplate = function(api, state) {

	// Your private functions and variables go here
	var totalVisits = 0;

	return {
        /**
         * initialize() is called only once when the Add-In is first loaded. Use this function to initialize the
         * Add-In's state such as default values or make API requests (MyGeotab or external) to ensure interface
         * is ready for the user.
         * @param api The GeotabApi object for making calls to MyGeotab.
         * @param state The page state object allows access to URL, page navigation and global group filter.
         * @param initializeCallback Call this when your initialize route is complete. Since your initialize routine
         *        might be doing asynchronous operations, you must call this method when the Add-In is ready
         *        for display to the user.
         */
	    initialize: function(api, state, initializeCallback) {

			// The api object exposes a method we can call to get the current user identity. This is useful for
			// determining user context, such as regional settings, language preference and name. Use the api
			// to retrieve the currently logged on user object.
			api.getSession(function (session) {
				var currentUser = session.userName;
				api.call("Get", {
					"typeName" : "User",
					"search" : {
						"name" : currentUser
					}
				}, function (result) {
					if (result.length === 0) {
						throw "Unable to find currently logged on user."
					}
					document.getElementById("template-displayName").innerHTML = result[0].firstName + " " + result[0].lastName;
					document.getElementById("template-container").style.display = "block";
					initializeCallback();

				}, function (error) {
					throw "Error while trying to load currently logged on user. " + error;
				});
			});
	    },

        /**
         * focus() is called whenever the Add-In receives focus.
         *
         * The first time the user clicks on the Add-In menu, initialize() will be called and when completed, focus().
         * focus() will be called again when the Add-In is revisited. Note that focus() will also be called whenever
         * the global state of the MyGeotab application changes, for example, if the user changes the global group
         * filter in the UI.
         *
         * @param api The GeotabApi object for making calls to MyGeotab.
         * @param page The page state object allows access to URL, page navigation and global group filter.
         */
	    focus: function(api, state) {

			totalVisits = totalVisits + 1;
			document.getElementById("template-visitCount").innerHTML = totalVisits;

		},
		
		/**
		 * blur() is called whenever the user navigates away from the Add-In.
		 *
		 * Use this function to save the page state or commit changes to a data store or release memory.
		 *
         * @param api The GeotabApi object for making calls to MyGeotab.
         * @param page The page state object allows access to URL, page navigation and global group filter.
		 */
		blur: function(api, state) {
		}
	};
};
