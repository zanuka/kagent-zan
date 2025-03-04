from datetime import datetime
import json
from pathlib import Path
from typing import Any, Dict

REPORT_DIR = Path(__file__).parent / "test_results"


class GenerateResourceTestResult:
    """Class to hold test results for reporting."""

    results = []

    @classmethod
    def add_result(
        cls,
        test_name: str,
        input_description: str,
        resource_type: str,
        expected_yaml: Dict[str, Any],
        actual_yaml: Dict[str, Any],
        similarity_score: float,
        diff_details: str,
    ):
        """Add a result to the results list."""
        cls.results.append(
            {
                "test_name": test_name,
                "input_description": input_description,
                "resource_type": resource_type,
                "expected_yaml": expected_yaml,
                "actual_yaml": actual_yaml,
                "similarity_score": similarity_score,
                "diff_details": diff_details,
                "timestamp": datetime.now().isoformat(),
            }
        )

    @classmethod
    def generate_report(cls, similarity_threshold: float):
        """Generate a console-based report of test results."""
        if not cls.results:
            print("No test results to report.")
            return

        # Calculate overall metrics
        total_tests = len(cls.results)
        avg_score = sum(r["similarity_score"] for r in cls.results) / total_tests if total_tests > 0 else 0

        # Prepare a dictionary for JSON export
        report_data = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": total_tests,
            "average_similarity": avg_score,
            "results": cls.results,
        }

        # Ensure test_results directory exists
        REPORT_DIR.mkdir(exist_ok=True, parents=True)

        # Generate JSON report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        json_path = REPORT_DIR / f"test_results_{timestamp}.json"
        with open(json_path, "w") as f:
            json.dump(report_data, f, indent=2)

        # Print console report
        print("\n" + "=" * 80)
        print(f"GENERATIVE RESOURCE TOOL - TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests: {total_tests}")
        print(f"Average Similarity Score: {avg_score:.2%}")
        print("=" * 80)

        # Group results by resource type
        results_by_type = {}
        for result in cls.results:
            resource_type = result["resource_type"]
            if resource_type not in results_by_type:
                results_by_type[resource_type] = []
            results_by_type[resource_type].append(result)

        # Print results grouped by resource type
        for resource_type, type_results in results_by_type.items():
            print(f"\nResource Type: {resource_type}")
            print("-" * 40)

            # Sort results by similarity score (descending)
            sorted_results = sorted(type_results, key=lambda x: x["similarity_score"], reverse=True)

            for result in sorted_results:
                # Determine color/status based on similarity score
                if result["similarity_score"] >= 0.9:
                    status = "✓"  # Checkmark
                elif result["similarity_score"] >= 0.7:
                    status = "!"  # Warning
                else:
                    status = "✗"  # Cross

                print(f"{status} {result['test_name']}: {result['similarity_score']:.2%} match")
                print(f"   Input: {result['input_description']}")

                # Only print detailed diff if similarity is low
                if result["similarity_score"] < 0.9:
                    print("   Differences:")
                    diff_lines = result["diff_details"].split("\n")
                    for line in diff_lines[:5]:  # Limit to first 5 lines of diff
                        print(f"     {line}")
                    if len(diff_lines) > 5:
                        print("     ...")

                print()

        # Identify and highlight failing tests
        failing_tests = [r for r in cls.results if r["similarity_score"] < similarity_threshold]
        if failing_tests:
            print("\n" + "=" * 80)
            print("FAILING TESTS")
            print("=" * 80)
            for test in failing_tests:
                print(f"Test: {test['test_name']}")
                print(f"Resource Type: {test['resource_type']}")
                print(f"Similarity Score: {test['similarity_score']:.2%}")
                print(f"Input: {test['input_description']}")
                print("Detailed Differences:")
                print(test["diff_details"])
                print("-" * 40)

        print(f"\nFull report saved to: {json_path}")

        return report_data
